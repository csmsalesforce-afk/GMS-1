public with sharing class ReviewerNotificationController {

    @AuraEnabled(cacheable=true)
    public static List<Grant_Applicant__c> getReviewerNotifications(){

        return [
            SELECT Id,
                   Name,
                   Project_Title__c,
                   Application_Status__c,
                   CreatedDate
            FROM Grant_Applicant__c
            WHERE Application_Status__c = 'Under Internal Review'
            AND Reviewer_Assigned__c = :UserInfo.getUserId()
            ORDER BY CreatedDate DESC
            LIMIT 10
        ];

    }

}