@RestResource(urlMapping='/programs/*')
global without sharing class ProgramAPI {

    @HttpGet
    global static void getPrograms() {

        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        String programType = req.params.get('type');

        List<Program__c> programs;

        if(String.isBlank(programType) || programType == 'All') {
            programs = [
                SELECT Id, Name, Program_Type__c, Max_Amount__c, Program_Fund__c
                FROM Program__c
                WHERE Status__c = 'Open'
                ORDER BY CreatedDate DESC
            ];
        } else {
            programs = [
                SELECT Id, Name, Program_Type__c, Max_Amount__c, Program_Fund__c
                FROM Program__c
                WHERE Status__c = 'Open'
                AND Program_Type__c = :programType
                ORDER BY CreatedDate DESC
            ];
        }

        res.addHeader('Content-Type', 'application/json');
        res.responseBody = Blob.valueOf(JSON.serialize(programs));
    }
}