import { LightningElement, api, track } from "lwc";

export default class GanttChartResource extends LightningElement {
  @api isResourceView; // resource page has different layout
  @api projectId; // used on project page for quick adding of allocations
  @api
  get resource() {
    return this._resource;
  }
  set resource(_resource) {
    this._resource = _resource;
    this.setProjects();
  }

  // dates
  @api startDate;
  @api endDate;
  @api dateIncrement;

  @api
  refreshDates(startDate, endDate, dateIncrement) {
    if (startDate && endDate && dateIncrement) {
      let times = [];
      let today = new Date();
      today.setHours(0, 0, 0, 0);
      today = today.getTime();

      for (
        let date = new Date(startDate);
        date <= endDate;
        date.setDate(date.getDate() + dateIncrement)
      ) {
        let time = {
          class: "slds-col lwc-timeslot",
          start: date.getTime()
        };

        if (dateIncrement > 1) {
          let end = new Date(date);
          end.setDate(end.getDate() + dateIncrement - 1);
          time.end = end.getTime();
        } else {
          time.end = date.getTime();

          if (times.length % 7 === 6) {
            time.class += " lwc-is-week-end";
          }
        }

        if (today >= time.start && today <= time.end) {
          time.class += " lwc-is-today";
        }

        times.push(time);
      }

      this.times = times;
      this.startDate = startDate;
      this.endDate = endDate;
      this.dateIncrement = dateIncrement;
      this.setProjects();
    }
  }

  // used by parent level window
  @api
  closeAllocationMenu() {
    if (this.menuData.open) {
      this.menuData.show = true;
      this.menuData.open = false;
    } else {
      this.menuData = {
        show: false,
        open: false
      };
    }
  }

  @track addAllocationData = {};
  @track editAllocationData = {};

  @track menuData = {
    open: false,
    show: false,
    style: ""
  };

  @track projects = [];

  effortOptions = [
    {
      label: "Low",
      value: "Low"
    },
    {
      label: "Medium",
      value: "Medium"
    },
    {
      label: "High",
      value: "High"
    }
  ];
  statusOptions = [
    {
      label: "Active",
      value: "Active"
    },
    {
      label: "Hold",
      value: "Hold"
    }
  ];

  connectedCallback() {
    this.refreshDates(this.startDate, this.endDate, this.dateIncrement);
  }

  // calculate allocation classes
  calcClass(allocation) {
    let classes = ["slds-is-absolute", "lwc-allocation"];

    switch (allocation.Status__c) {
      case "Unavailable":
        classes.push("unavailable");
        break;
      case "Hold":
        classes.push("hold");
        break;
      default:
        break;
    }

    if ("Unavailable" !== allocation.Status__c) {
      switch (allocation.Effort__c) {
        case "Low":
          classes.push("low-effort");
          break;
        case "Medium":
          classes.push("medium-effort");
          break;
        case "High":
          classes.push("high-effort");
          break;
        default:
          break;
      }
    }

    return classes.join(" ");
  }

  // calculate allocation positions/styles
  calcStyle(allocation) {
    if (!this.times) {
      return;
    }

    const totalSlots = this.times.length;
    let styles = [
      "left: " + (allocation.left / totalSlots) * 100 + "%",
      "right: " +
        ((totalSlots - (allocation.right + 1)) / totalSlots) * 100 +
        "%"
    ];

    if ("Unavailable" !== allocation.Status__c) {
      const backgroundColor = allocation.color;
      const colorMap = {
        Blue: "#1589EE",
        Green: "#4AAD59",
        Red: "#E52D34",
        Turqoise: "#0DBCB9",
        Navy: "#052F5F",
        Orange: "#E56532",
        Purple: "#62548E",
        Pink: "#CA7CCE",
        Brown: "#823E17",
        Lime: "#7CCC47",
        Gold: "#FCAF32"
      };
      styles.push("background-color: " + colorMap[backgroundColor]);
    }

    if (!isNaN(this.dragInfo.startIndex)) {
      styles.push("pointer-events: none");
      styles.push("transition: left ease 250ms, right ease 250ms");
    } else {
      styles.push("pointer-events: auto");
      styles.push("transition: none");
    }

    return styles.join("; ");
  }

  // calculate allocation label position
  calcLabelStyle(allocation) {
    if (!this.times) {
      return;
    }

    const totalSlots = this.times.length;
    let left =
      allocation.left / totalSlots < 0 ? 0 : allocation.left / totalSlots;
    let right =
      (totalSlots - (allocation.right + 1)) / totalSlots < 0
        ? 0
        : (totalSlots - (allocation.right + 1)) / totalSlots;
    let styles = [
      "left: calc(" + left * 100 + "% + 15px)",
      "right: calc(" + right * 100 + "% + 30px)"
    ];

    if (!isNaN(this.dragInfo.startIndex)) {
      styles.push("transition: left ease 250ms, right ease 250ms");
    } else {
      styles.push("transition: none");
    }

    return styles.join("; ");
  }

  setProjects() {
    let self = this;
    self.projects = [];

    Object.keys(self._resource.allocationsByProject).forEach(projectId => {
      let project = {
        id: projectId,
        allocations: []
      };

      self.resource.allocationsByProject[projectId].forEach(allocation => {
        allocation = Object.assign({}, allocation);
        allocation.class = self.calcClass(allocation);
        allocation.style = self.calcStyle(allocation);
        allocation.labelStyle = self.calcLabelStyle(allocation);

        project.allocations.push(allocation);
      });

      self.projects.push(project);
    });
  }

  /*** Drag/Drop ***/
  dragInfo = {};
  handleDragStart(event) {
    let container = this.template.querySelector(
      "." + event.currentTarget.dataset.id + " .lwc-allocation"
    );
    this.dragInfo.projectIndex = container.dataset.project;
    this.dragInfo.allocationIndex = container.dataset.allocation;
    this.dragInfo.newAllocation = this.projects[
      container.dataset.project
    ].allocations[container.dataset.allocation];

    // hide drag image
    container.style.opacity = 0;
    setTimeout(function() {
      container.style.pointerEvents = "none";
    }, 0);
  }
  /*** /Drag/Drop ***/
}
