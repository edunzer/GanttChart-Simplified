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
  @track selectedResources = []; // Track selected resources
  @track selectedProjects = []; // Track selected projects

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
        value: "1/14"
      },
      {
        label: "By Week",
        value: "7/10"
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
      switch (this.defaultView) {
        case "By Day":
          this.setView("1/14");
          break;
        default:
          this.setView("7/10");
      }
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
    this.endDate = moment(this.startDate)
      .add(this.view.slots * this.view.slotSize - 1, "days")
      .toDate();
    this.endDateUTC =
      moment(this.endDate)
        .utc()
        .valueOf() -
      moment(this.endDate).utcOffset() * 60 * 1000 +
      "";
    this.formattedEndDate = this.endDate.toLocaleDateString();

    let today = new Date();
    today.setHours(0, 0, 0, 0);
    today = today.getTime();

    let dates = {};

    for (let date = moment(this.startDate); date <= moment(this.endDate); date.add(this.view.slotSize, "days")) {
      let index = date.format("YYYYMM");
      if (!dates[index]) {
        dates[index] = {
          dayName: '',
          name: date.format("MMMM"),
          days: []
        };
      }

      let day = {
        class: "slds-col slds-p-vertical_x-small slds-m-top_x-small lwc-timeline_day",
        label: date.format("M/D"),
        start: date.toDate()
      };

      if (this.view.slotSize > 1) {
        let end = moment(date).add(this.view.slotSize - 1, "days");
        day.end = end.toDate();
      } else {
        day.end = date.toDate();
        day.dayName = date.format("ddd");
        if (date.day() === 0) {
          day.class = day.class + " lwc-is-week-end";
        }
      }

      if (today >= day.start && today <= day.end) {
        day.class += " lwc-is-today";
      }

      dates[index].days.push(day);
      dates[index].style =
        "width: calc(" +
        dates[index].days.length +
        "/" +
        this.view.slots +
        "*100%)";
    }

    // reorder index
    this.dates = Object.values(dates);

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
    let values = value.split("/");
    this.view.value = value;
    this.view.slotSize = parseInt(value[0], 10);
    this.view.slots = parseInt(values[1], 10);
  }

  handleViewChange(event) {
    this.setView(event.target.value);
    this.setDateHeaders();
    this.handleRefresh();
  }

  clearFilters() {
    this.selectedResources = [];
    this.selectedProjects = [];
    this.handleRefresh(); // Refresh data with cleared filters
  }

  // New method for applying filters
  applyFilters() {
    this.handleRefresh(); // Trigger data refresh with the current filters
  }

  
  
  /*** /Navigation ***/

  handleRefresh() {
    let self = this;

    getChartData({
        recordId: self.recordId ? self.recordId : '',
        startTime: self.startDateUTC,
        endTime: self.endDateUTC,
        slotSize: self.view.slotSize,
        filterProjects: self._filterData.projectIds, // Filtering happens here in Apex
    })
        .then(data => {
            self.isResourceView = typeof self.objectApiName !== 'undefined' && self.objectApiName.endsWith('Resource__c');
            self.isProjectView = typeof self.objectApiName !== 'undefined' && self.objectApiName.endsWith('Project__c');

            self.resources = data.resources;
            self.projects = data.projects;
            self.projectId = data.projectId;
        })
        .catch(error => {
            this.dispatchEvent(new ShowToastEvent({
                message: error.body.message,
                variant: 'error'
            }));
        });
  }
}
