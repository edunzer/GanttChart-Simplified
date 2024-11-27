import { LightningElement, api, track, wire } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import momentJS from "@salesforce/resourceUrl/momentJS";
import { loadScript } from "lightning/platformResourceLoader";
import getChartData from "@salesforce/apex/ganttChart.getChartData";

export default class GanttChart extends LightningElement {
  @api recordId = "";
  @api objectApiName;
  @api defaultView;

  @track isResourceView;
  @track isProjectView;

  @track startDateUTC; // sending to backend using time
  @track endDateUTC; // sending to backend using time
  @track formattedStartDate; // Title (Date Range)
  @track formattedEndDate; // Title (Date Range)
  @track dates = []; // Dates (Header)
  dateShift = 7; // determines how many days we shift by

  @track isFilterPanelOpen = false; // Track filter panel state
  @track selectedResourceId = null; // Track selected Resource
  @track selectedProjectId = null; // Track selected Project  

  @track resourceModalData = {};
  @track startDate;
  @track endDate;
  @track projectId;
  @track resources = [];

  @track datePickerString; // Date Navigation
  @track view = {
    // View Select
    options: [
      {
        label: "By Day",
        value: "1/14" // 1 day per slot, 14 total slots
      },
      {
        label: "By Week",
        value: "7/10" // 7 days per slot, 10 total slots
      },
      {
        label: "By Month",
        value: "30/12" // 1 month per slot, 12 total slots
      },
      {
        label: "By Quarter",
        value: "90/4" // 3 months per slot, 4 total slots
      }
    ],
    slotSize: 1,
    slots: 1    
  };

  @track filterModalData = {
    disabled: true,
    message: "",
    projects: [],
  };
  _filterData = {
    projects: [],
    projectIds: [],
  };

  constructor() {
    super();
  }

  connectedCallback() {
    Promise.all([
        loadScript(this, momentJS)
    ]).then(() => {
        console.log("Default View:", this.defaultView); // Log the default view

        switch (this.defaultView) {
            case "By Day":
                this.setView("1/14");
                break;
            case "By Week":
                this.setView("7/10");
                break;
            case "By Month":
                this.setView("30/12");
                break;
            case "By Quarter":
                this.setView("90/4");
                break;
            default:
                this.setView("1/14"); // Default to "By Day"
        }

        console.log("View Set:", this.view); // Log the selected view
        this.setStartDate(new Date());
        this.handleRefresh();
    });
  }
  

  /*** Navigation ***/
  setStartDate(_startDate) {
    if (_startDate instanceof Date && !isNaN(_startDate)) {
      _startDate.setHours(0, 0, 0, 0);

      this.datePickerString = _startDate.toISOString();

      this.startDate = moment(_startDate)
        .day(1)
        .toDate();
      this.startDateUTC =
        moment(this.startDate)
          .utc()
          .valueOf() -
        moment(this.startDate).utcOffset() * 60 * 1000 +
        "";
      this.formattedStartDate = this.startDate.toLocaleDateString();

      this.setDateHeaders();
    } else {
      this.dispatchEvent(
        new ShowToastEvent({
          message: "Invalid Date",
          variant: "error"
        })
      );
    }
  }

  setDateHeaders() {
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    today = today.getTime();

    let dates = {};
    let date = moment(this.startDate);

    console.log("Generating Date Headers:", {
        startDate: this.startDate,
        slotSize: this.view.slotSize,
        slots: this.view.slots
    }); // Log timeline generation parameters

    // Loop based on the number of slots
    for (let i = 0; i < this.view.slots; i++) {
        let index = date.format("YYYYMM");
        if (!dates[index]) {
            dates[index] = {
                dayName: "",
                name: "",
                days: []
            };
        }

        let day = {
            class: "slds-col slds-p-vertical_x-small slds-m-top_x-small lwc-timeline_day",
            label: "",
            start: date.toDate(),
            end: null
        };

        if (this.view.slotSize === 1) {
            // By Day: Each column is 1 day
            day.label = date.format("M/D");
            day.end = date.toDate();
            date.add(1, "days");
        } else if (this.view.slotSize === 7) {
            // By Week: Each column is 7 days
            day.label = `Week of ${date.format("MMM D")}`;
            day.end = moment(date).add(6, "days").toDate();
            date.add(7, "days");
        } else if (this.view.slotSize === 30) {
            // By Month: Dynamically calculate days in the month
            day.label = date.format("MMMM YYYY");
            day.end = date.endOf("month").toDate();
            date.add(1, "month");
        } else if (this.view.slotSize === 90) {
            // By Quarter: Dynamically calculate days in the quarter
            const quarter = Math.ceil((date.month() + 1) / 3); // Calculate quarter
            day.label = `Q${quarter} ${date.year()}`;
            day.end = moment(date).add(2, "months").endOf("month").toDate();
            date.add(3, "months");
        }

        console.log("Generated Day:", {
            label: day.label,
            start: day.start,
            end: day.end,
            class: day.class
        }); // Log each day/slot details

        // Highlight today's column
        if (today >= day.start.getTime() && today <= day.end.getTime()) {
            day.class += " lwc-is-today";
        }

        // Add the day to the dates object
        dates[index].days.push(day);
        dates[index].style = `width: calc(1 / ${this.view.slots} * 100%)`;
    }

    // Convert dates object into an array for rendering
    this.dates = Object.values(dates);

    console.log("Final Dates Array:", this.dates); // Log the final dates array

    // Calculate the end date for the timeline
    this.endDate = date.toDate();
    this.endDateUTC =
        moment(this.endDate)
            .utc()
            .valueOf() -
        moment(this.endDate).utcOffset() * 60 * 1000 +
        "";
    this.formattedEndDate = this.endDate.toLocaleDateString();

    console.log("Timeline Range:", {
        startDate: this.startDate,
        endDate: this.endDate
    }); // Log the timeline range

    // Refresh associated resources
    Array.from(
        this.template.querySelectorAll("c-gantt_chart_resource")
    ).forEach(resource => {
        resource.refreshDates(this.startDate, this.endDate, this.view.slotSize);
    });
  }


  toggleFilterPanel() {
    this.isFilterPanelOpen = !this.isFilterPanelOpen;
  }

  get filterPanelClass() {
    return this.isFilterPanelOpen
      ? "slds-col slds-size_1-of-6 lwc-filter-panel"
      : "slds-col lwc-filter-panel-collapsed";
  }

  navigateToToday() {
    this.setStartDate(new Date());
    this.handleRefresh();
  }

  navigateToPrevious() {
    let _startDate = new Date(this.startDate);
    _startDate.setDate(_startDate.getDate() - this.dateShift);

    this.setStartDate(_startDate);
    this.handleRefresh();
  }

  navigateToNext() {
    let _startDate = new Date(this.startDate);
    _startDate.setDate(_startDate.getDate() + this.dateShift);

    this.setStartDate(_startDate);
    this.handleRefresh();
  }

  navigateToDay(event) {
    this.setStartDate(new Date(event.target.value + "T00:00:00"));
    this.handleRefresh();
  }

  setView(value) {
    console.log("Setting View with Value:", value); // Log the raw value

    let values = value.split("/");
    this.view.value = value;
    this.view.slotSize = parseInt(values[0], 10);
    this.view.slots = parseInt(values[1], 10);

    console.log("View Updated:", {
        slotSize: this.view.slotSize,
        slots: this.view.slots
    }); // Log the updated view parameters
  }

  handleViewChange(event) {
    this.setView(event.target.value);
    this.setDateHeaders();
    this.handleRefresh();
  }

  handleResourceChange(event) {
    this.selectedResourceId = event.detail.recordId;
  }
  
  handleProjectChange(event) {
    this.selectedProjectId = event.detail.recordId;
  }  

  clearFilters() {
    // Reset selected IDs to the inherited recordId context
    this.selectedResourceId = this.objectApiName === "Resource__c" ? this.recordId : null;
    this.selectedProjectId = this.objectApiName === "Project__c" ? this.recordId : null;
  
    // Clear the selection in the lightning-record-picker elements
    const resourcePicker = this.template.querySelector('[data-id="resourcePicker"]');
    const projectPicker = this.template.querySelector('[data-id="projectPicker"]');
  
    if (resourcePicker) {
      resourcePicker.clearSelection(); // Clear Resource picker
    }
    if (projectPicker) {
      projectPicker.clearSelection(); // Clear Project picker
    }
  
    // Refresh the data with cleared filters
    this.handleRefresh();
  }

  // New method for applying filters
  applyFilters() {
    this.handleRefresh(); // Trigger data refresh with the current filters
  }
  
  /*** /Navigation ***/

  handleRefresh() {
    // Determine context and set default filter values
    if (this.objectApiName === "Resource__c") {
      // Resource context
      this.selectedResourceId = this.recordId; // Use recordId as Resource ID
      // Accept user-provided project filter
    } else if (this.objectApiName === "Project__c") {
      // Project context
      this.selectedProjectId = this.recordId; // Use recordId as Project ID
      // Accept user-provided resource filter
    }
  
    // Call Apex with the updated filters
    getChartData({
      resourceId: this.selectedResourceId ? this.selectedResourceId : null,
      projectId: this.selectedProjectId ? this.selectedProjectId : null,
      startTime: this.startDateUTC,
      endTime: this.endDateUTC,
      slotSize: this.view.slotSize
    })
      .then(data => {
        // Set flags for UI rendering
        this.isResourceView = this.objectApiName === "Resource__c";
        this.isProjectView = this.objectApiName === "Project__c";
  
        // Update data
        this.resources = data.resources;
        this.projects = data.projects;
      })
      .catch(error => {
        // Show error notification
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Error fetching chart data",
            message: error.body.message,
            variant: "error"
          })
        );
      });
  }
  
   
}
