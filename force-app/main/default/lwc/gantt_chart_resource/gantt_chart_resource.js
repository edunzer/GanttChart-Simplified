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
        today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
        today = today.getTime();

        for (
            let date = new Date(startDate);
            date <= endDate;
            date.setDate(date.getDate() + dateIncrement)
        ) {
            let time = {
                class: "slds-col lwc-timeslot",
                start: date.getTime(),
                end: null // Initialize the end property
            };

            if (dateIncrement > 1) {
                let end = new Date(date);
                end.setDate(end.getDate() + dateIncrement - 1);
                time.end = end.getTime();
            } else {
                time.end = date.getTime();
            }

            // Check if today falls within the time slot
            if (today >= time.start && today <= time.end) {
                time.class += " lwc-is-today";
            }

            // Highlight weekends if applicable
            if (dateIncrement === 1 && date.getDay() === 0) {
                time.class += " lwc-is-week-end";
            }

            times.push(time);
        }

        // Assign the calculated times to the component
        this.times = times;
        this.startDate = startDate;
        this.endDate = endDate;
        this.dateIncrement = dateIncrement;

        // Update related projects after setting times
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

    // Calculate Styles
    let styles = [
        `left: ${(allocation.left / totalSlots) * 100}%`,
        `right: ${((totalSlots - (allocation.right + 1)) / totalSlots) * 100}%`,
        "background-color: #1589EE", // Default blue color
        "pointer-events: auto",
        "transition: none"
    ];

    // Calculate Label Styles
    let left = allocation.left / totalSlots < 0 ? 0 : allocation.left / totalSlots;
    let right =
        (totalSlots - (allocation.right + 1)) / totalSlots < 0
            ? 0
            : (totalSlots - (allocation.right + 1)) / totalSlots;
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
