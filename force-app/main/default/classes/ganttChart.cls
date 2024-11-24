public with sharing class ganttChart {
    @AuraEnabled
    public static Map<String, Object> getChartData(String recordId, String startTime, String endTime, Integer slotSize, List<String> filterProjects) {
        Map<String, Object> data = new Map<String, Object>();
        try {
            
            // Parse date ranges
            Date startDate = DateTime.newInstance(Long.valueOf(startTime)).date();
            Date endDate = DateTime.newInstance(Long.valueOf(endTime)).date();

            // Base query with parameters
            String baseQuery = 'SELECT Resource__c, Resource__r.Name, Resource__r.Default_Role__c, ' +
                'Project__c, Project__r.Name, Start_Date__c, End_Date__c ' +
                'FROM Allocation__c ' +
                'WHERE Start_Date__c <= :endDate AND End_Date__c >= :startDate' +
                'LIMIT 500';

            // Add filters
            if (!String.isEmpty(recordId)) {
                baseQuery += ' AND (Project__c = :recordId OR Resource__c = :recordId)';
            }
            if (!filterProjects.isEmpty()) {
                baseQuery += ' AND Project__c IN :filterProjects';
            }

            baseQuery += ' ORDER BY Resource__r.Name, Project__r.Name, Start_Date__c';

            // Execute query
            List<Allocation__c> allocations = Database.query(baseQuery);

            // Map data for LWC
            Map<String, Object> projectById = new Map<String, Object>();
            Map<String, Object> resourceById = new Map<String, Object>();

            for (Allocation__c allocation : allocations) {
                // Ensure resources are included
                if (!resourceById.containsKey(allocation.Resource__c)) {
                    resourceById.put(allocation.Resource__c, new Map<String, Object> {
                        'Id' => allocation.Resource__c,
                        'Name' => allocation.Resource__r.Name,
                        'Default_Role__c' => allocation.Resource__r.Default_Role__c,
                        'allocationsByProject' => new Map<String, Object>()
                    });
                }
                Map<String, Object> resource = (Map<String, Object>)resourceById.get(allocation.Resource__c);

                // Organize by project
                if (!resource.containsKey('allocationsByProject')) {
                    resource.put('allocationsByProject', new Map<String, Object>());
                }

                Map<String, Object> allocationsByProject = (Map<String, Object>)resource.get('allocationsByProject');
                if (!allocationsByProject.containsKey(allocation.Project__c)) {
                    allocationsByProject.put(allocation.Project__c, new List<Object>());
                }

                projectById.put(allocation.Project__c, new Map<String, Object> {
                    'Id' => allocation.Project__c,
                    'Name' => allocation.Project__r.Name
                });

                List<Object> projectAllocations = (List<Object>)allocationsByProject.get(allocation.Project__c);

                Decimal left = Decimal.valueOf(startDate.daysBetween(allocation.Start_Date__c)) / slotSize;
                Decimal right = Decimal.valueOf(startDate.daysBetween(allocation.End_Date__c)) / slotSize;

                projectAllocations.add(new Map<String, Object> {
                    'Id' => allocation.Id,
                    'Start_Date__c' => allocation.Start_Date__c,
                    'End_Date__c' => allocation.End_Date__c,
                    'projectName' => allocation.Project__r.Name,
                    'left' => left.round(System.RoundingMode.FLOOR),
                    'right' => right.round(System.RoundingMode.FLOOR)
                });
            }

            data.put('projects', projectById.values());
            data.put('resources', resourceById.values());

        } catch (Exception e) {
            throw new AuraHandledException('Error fetching Gantt Chart data: ' + e.getMessage());
        }

        return data;
    }

    @AuraEnabled
    public static List<Object> getResources() {
        List<Object> resources = new List<Object>();

        for (Resource__c r : [SELECT Id, Name, Default_Role__c
                              FROM Resource__c
                              ORDER BY Name]) {
            resources.add(new Map<String, Object> {
                'Id' => r.Id,
                'Name' => r.Name,
                'Default_Role__c' => r.Default_Role__c
            });
        }

        return resources;
    }

    @AuraEnabled
    public static List<Project__c> getProjects() {
        List<Project__c> projects = [SELECT Id, Name FROM Project__c ORDER BY Name];
        return projects;
    }
}
