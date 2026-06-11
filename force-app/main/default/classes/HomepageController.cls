public with sharing class HomepageController {

    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getApplicationStats() {

        Id userId = UserInfo.getUserId();

        Map<String, Integer> stats = new Map<String, Integer>{
            'draft' => 0,
            'submitted' => 0,
            'approved' => 0,
            'rejected' => 0
        };

        for (Grant_Applicant__c app : [
            SELECT Application_Status__c
            FROM Grant_Applicant__c
            WHERE OwnerId = :userId
        ]) {

            if (app.Application_Status__c == 'Draft') stats.put('draft', stats.get('draft') + 1);
            if (app.Application_Status__c == 'Submitted') stats.put('submitted', stats.get('submitted') + 1);
            if (app.Application_Status__c == 'Approved') stats.put('approved', stats.get('approved') + 1);
            if (app.Application_Status__c == 'Rejected') stats.put('rejected', stats.get('rejected') + 1);
        }

        return stats;
    }
}