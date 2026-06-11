public with sharing class ProgramListController {

    @AuraEnabled(cacheable=true)
    public static List<Program__c> getPrograms(String programType) {

        if(String.isBlank(programType) || programType == 'All') {
            return [
                SELECT Id, Name, Program_Type__c, Max_Amount__c
                FROM Program__c
                WHERE Status__c ='Open'
                ORDER BY CreatedDate DESC
            ];
        }

        return [
            SELECT Id, Name, Program_Type__c, Max_Amount__c
            FROM Program__c
            WHERE Program_Type__c = :programType
            AND Status__c ='Open'
            ORDER BY CreatedDate DESC
        ];
    }
}