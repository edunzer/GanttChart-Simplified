import { LightningElement, api, track } from "lwc";
import { NavigationMixin } from "lightning/navigation";

export default class GanttChartResource extends NavigationMixin(LightningElement) {
  @api isResourceView; // Resource page layout flag
  @api startDate;
  @api endDate;
  @api dateIncrement;  
  @track projects = [];  
  
  @api
  get resource() {
    return this._resource;
  }
  set resource(_resource) {
    this._resource = _resource;
    if (this.startDate && this.endDate && this.dateIncrement) {
        this.refreshDates(this.startDate, this.endDate, this.dateIncrement);
    } else {
        console.warn("Start date, end date, or date increment not set. Skipping refreshDates.");
    }
    this.setProjects();
}


  @api
  refreshDates(startDate, endDate, dateIncrement) {
    console.log("Refreshing dates:", { startDate, endDate, dateIncrement });
    if (!startDate || !endDate || !dateIncrement) {
        console.error("Invalid date parameters. RefreshDates aborted.");
        return;
    }

    let times = [];
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    today = today.getTime();

    for (
        let date = new Date(startDate);
        date < endDate;
        date.setDate(date.getDate() + dateIncrement)
    ) {
        let time = {
            class: "slds-col lwc-timeslot",
            start: date.getTime(),
            end: null,
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

    console.log("Generated Times Array:", times); // Debug log
    this.times = times;
    this.startDate = startDate;
    this.endDate = endDate;
    this.dateIncrement = dateIncrement;

    this.setProjects();
}


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
    if (!this.times || this.times.length === 0) {
        console.warn("Times array is not yet initialized. Skipping setProjects.");
        this.projects = [];
        return;
    }

    this.projects = Object.keys(this._resource.allocationsByProject).map((projectId) => {
        const allocations = this._resource.allocationsByProject[projectId].map((allocation) => {
            const totalSlots = this.times.length || 1; // Use actual `this.times` length
            return this.prepareAllocationDisplay({ ...allocation, totalSlots });
        });

        return { id: projectId, allocations };
    });
    }



  handleAllocationClick(event) {
    // Retrieve the data-id from the clicked element or its parent
    const allocationId = event.currentTarget.dataset.id;
    console.log('Allocation Clicked:', allocationId); // Debugging log
    if (allocationId) {
        // Navigate to the allocation record page
        this[NavigationMixin.Navigate]({
            type: "standard__recordPage",
            attributes: {
                recordId: allocationId,
                objectApiName: "Allocation__c", // Replace with the correct API name
                actionName: "view",
            },
        });
    }
  }

  handleResourceClick(event) {
    // Retrieve the data-id from the clicked element
    const resourceId = event.currentTarget.dataset.id;
    console.log('Resource Clicked:', resourceId); // Debugging log
    if (resourceId) {
        // Navigate to the resource record page
        this[NavigationMixin.Navigate]({
            type: "standard__recordPage",
            attributes: {
                recordId: resourceId,
                objectApiName: "Resource__c", // Replace with the correct API name
                actionName: "view",
            },
        });
    }
  }


}
