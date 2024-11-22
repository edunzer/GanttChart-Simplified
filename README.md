# Gantt Chart Component

## Overview

The `GanttChart` is a Salesforce Lightning Web Component (LWC) designed to display project and resource data in a Gantt chart format within Salesforce. It provides users with a visual timeline of tasks and allocations, enabling efficient planning and tracking of project schedules and resources.

> This specific repo is designed to be the perfect starting point for making your own custom LWC Gantt Chart component. Only bare gantt functionality is available making it a perfect starting point to add on filtering, drag and drop, etc. using your own desired functionality.  

Key features include:
- Dynamic date navigation and filtering.
- Visualization of resource allocations and project timelines.
- Integration with Salesforce data via Apex for real-time updates.

This component is ideal for visualizing multi object record relationship structure over time. Its enhanced streamlined approach makes it the idea starting point for building your own custom LWC Gantt Chart. 

## Features

### Dynamic Views
Depending on what type of page you put the component on the filtering and view can change. 
- **Resource Page**: Puting the component on a resource page filters all allocations to that resource.
![Modal Popup Example](./img/Screenshot%202024-11-22%20142127.png)
- **Project Page**: Puting the component on a resource page filters all allocations to that project.|
![Modal Popup Example](./img/Screenshot%202024-11-22%20142121.png)
- The default view shows all resources and projects.
![Modal Popup Example](./img/Screenshot%202024-11-22%20142110.png)

> These can be easily changed to your used objects by changing the object names in the `getChartData` method inside of `gantt_chart.js`

### Date Navigation
- Navigate between past and future dates with:
  - **Previous** and **Next** controls.
  - A **Today** button for quick navigation.
  - Direct date selection using a date picker.

### Efficient Data Fetching
- Leverages an Apex controller (`ganttChart`) to fetch and process data.
- Optimized queries for performance, ensuring only relevant data is retrieved.

### Lightweight and Responsive
- Designed to adapt to different screen sizes and layouts.
- Uses modern salesforce lwc web standards for fast and reliable performance.

---

### Base Repository

This component is forked from the [Salesforce Labs GanttChart repository](https://github.com/SalesforceLabs/GanttChart). Significant code has been removed along with enhancements to simplify the base code for easier customization based on your own needs.

For issues, suggestions, or contributions, please contact the repository owner or submit a pull request.
