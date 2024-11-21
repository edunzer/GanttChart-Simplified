import { LightningElement, api, track, wire } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

import momentJS from "@salesforce/resourceUrl/momentJS";
import { loadScript } from "lightning/platformResourceLoader";

import getChartData from "@salesforce/apex/ganttChart.getChartData";
import getProjects from "@salesforce/apex/ganttChart.getProjects";
import getResources from "@salesforce/apex/ganttChart.getResources";

export default class GanttChart extends LightningElement {
  @api recordId = "";
  @api objectApiName;

  @track isResourceView;
  @track isProjectView;
  @track isRecordTypeView; 

  // design attributes
  @api defaultView;

  // navigation
  @track startDateUTC; // sending to backend using time
  @track endDateUTC; // sending to backend using time
  @track formattedStartDate; // Title (Date Range)
  @track formattedEndDate; // Title (Date Range)
  @track dates = []; // Dates (Header)
  dateShift = 7; // determines how many days we shift by

  // options
  @track datePickerString; // Date Navigation
  @track view = {
    // View Select
    options: [
      {
        label: "View by Day",
        value: "1/14"
      },
      {
        label: "View by Week",
        value: "7/10"
      }
    ],
    slotSize: 1,
    slots: 1
  };

  /*** Modals ***/
  // TODO: move filter search to new component?
  @track filterModalData = {
    disabled: true,
    message: "",
    projects: [],
    projectRecordTypes: [], // Record Type Id for each option
    roles: [],
    status: "",
    projectOptions: [],
    projectRecordTypeOptions: [], // To filter based on the record types 
    roleOptions: [],
    statusOptions: [
      {
        // TODO: pull from backend? unsure how to handle "All"
        label: "All",
        value: ""
      },
      {
        label: "Hold",
        value: "Hold"
      },
      {
        label: "Unavailable",
        value: "Unavailable"
      }
    ]
  };
  _filterData = {
    projects: [],
    projectIds: [],
    projectRecordType: [], // to track record type Ids 
    roles: [],
    status: ""
  };
  @track resourceModalData = {};
  /*** /Modals ***/

  // gantt_chart_resource
  @track startDate;
  @track endDate;
  @track projectId;
  @track resources = [];

  constructor() {
    super();
    this.template.addEventListener("click", this.closeDropdowns.bind(this));
  }

  connectedCallback() {
    Promise.all([
      loadScript(this, momentJS)
    ]).then(() => {
      switch (this.defaultView) {
        case "View by Day":
          this.setView("1/14");
          break;
        default:
          this.setView("7/10");
      }
      this.setStartDate(new Date());
      this.handleRefresh();
    });
  }

  // catch blur on allocation menus
  closeDropdowns() {
    Array.from(
      this.template.querySelectorAll(".lwc-resource-component")
    ).forEach(row => {
      row.closeAllocationMenu();
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

    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
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
  /*** /Navigation ***/

  /*** Filter Modal ***/
  stopProp(event) {
    event.stopPropagation();
  }

  clearFocus() {
    this.filterModalData.focus = null;
  }

  filterProjects(event) {
    this.hideDropdowns();

    let text = event.target.value;

    getProjects().then(projects => {
      // only show projects not selected
      this.filterModalData.projectOptions = projects.filter(project => {
        return (
          project.Name &&
          project.Name.toLowerCase().includes(text.toLowerCase()) &&
          !this.filterModalData.projects.filter(p => {
            return p.id === project.Id;
          }).length
        );
      });
      this.filterModalData.focus = "projects";
    });
  }
  // Mohit's filter by record type
  filterProjectRecords(event) {
    this.hideDropdowns();
  
    let text = event.target.value;
  
    getProjects().then(projects => {
      // only show projects not selected
      this.filterModalData.projerojectRecordTypeOptions = projects.filter(project => {
        return (
          project.RecordTypeId &&
          !this.filterModalData.projects.filter(p => {
            return p.id === project.RecordTypeId;
          }).length
        );
      });
      this.filterModalData.focus = "rojectRecordTypeOptions";
    });
  }
  
  addProjectFilter(event) {
    this.filterModalData.projects.push(
      Object.assign({}, event.currentTarget.dataset)
    );
    this.filterModalData.focus = null;

    this.setFilterModalDataDisable();
  }

  handleRefresh() {
    // refreshApex(this.wiredData);
    let self = this;

    getChartData({
        recordId: self.recordId ? self.recordId : '',
        startTime: self.startDateUTC,
        endTime: self.endDateUTC,
        slotSize: self.view.slotSize,
        filterProjects: self._filterData.projectIds,
        filterProjectRecords: self._filterData.projectRecordTypes, // filter for record types
        filterRoles: self._filterData.roles,
        filterStatus: self._filterData.status
    }).then(data => {
        self.isResourceView = typeof self.objectApiName !== 'undefined' && self.objectApiName.endsWith('Resource__c');
        self.isProjectView = typeof self.objectApiName !== 'undefined' && self.objectApiName.endsWith('Project__c');
        self.isRecordTypeView = typeof self.objectApiName !== 'undefined' && self.objectApiName.endsWith('Project__c');
        self.projectId = data.projectId;
        self.projects = data.projects;
        self.roles = data.roles;

        // empty old data
        // we want to keep resources we've already seen
        self.resources.forEach(function (resource, i) {
            self.resources[i] = {
                Id: resource.Id,
                Name: resource.Name,
                Default_Role__c: resource.Default_Role__c,
                allocationsByProject: {}
            };
        });

        data.resources.forEach(function (newResource) {
            for (let i = 0; i < self.resources.length; i++) {
                if (self.resources[i].Id === newResource.Id) {
                    self.resources[i] = newResource;
                    return;
                }
            }

            self.resources.push(newResource);
        });

        debugger;
    }).catch(error => {
        this.dispatchEvent(new ShowToastEvent({
            message: error.body.message,
            variant: 'error'
        }));
    });
  }
}
