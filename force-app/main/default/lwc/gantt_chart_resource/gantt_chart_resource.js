import { LightningElement, api, track } from "lwc";

export default class GanttChartResource extends LightningElement {
  @api isResourceView; // Resource page layout flag
  @api
  get resource() {
    return this._resource;
  }
  set resource(_resource) {
    this._resource = _resource;
    this.setProjects();
  }

  // Dates
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

  @track projects = [];

  connectedCallback() {
    if (this.startDate && this.endDate && this.dateIncrement) {
        this.refreshDates(this.startDate, this.endDate, this.dateIncrement);
    }
  }


  prepareAllocationDisplay(allocation) {
    const totalSlots = this.times?.length || 1; // Fallback to 1 to avoid division by undefined

    // Calculate Classes
    let classes = ["slds-is-absolute", "lwc-allocation"];
    if (allocation.Status__c === "Unavailable") {
        classes.push("unavailable");
    } else if (allocation.Status__c === "Hold") {
        classes.push("hold");
    } else {
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
        }
    }

    // Calculate Styles
    let styles = [
        `left: ${(allocation.left / totalSlots) * 100}%`,
        `right: ${((totalSlots - (allocation.right + 1)) / totalSlots) * 100}%`,
        "pointer-events: auto",
        "transition: none"
    ];
    if (allocation.color && allocation.Status__c !== "Unavailable") {
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
        styles.push(`background-color: ${colorMap[allocation.color]}`);
    }

    // Calculate Label Styles
    let left = allocation.left / totalSlots < 0 ? 0 : allocation.left / totalSlots;
    let right = (totalSlots - (allocation.right + 1)) / totalSlots < 0 ? 0 : (totalSlots - (allocation.right + 1)) / totalSlots;
    let labelStyle = [
        `left: calc(${left * 100}% + 15px)`,
        `right: calc(${right * 100}% + 30px)`
    ];

    // Attach Calculated Styles to Allocation
    allocation.class = classes.join(" ");
    allocation.style = styles.join("; ");
    allocation.labelStyle = labelStyle.join("; ");

    return allocation;
  }


  // Replace in `setProjects`
  setProjects() {
    this.projects = Object.keys(this._resource.allocationsByProject).map(projectId => {
        const allocations = this._resource.allocationsByProject[projectId].map(allocation => {
            return this.prepareAllocationDisplay({ ...allocation });
        });

        return { id: projectId, allocations };
    });
  }

}
