public with sharing class GrantProgramsController {

    @AuraEnabled(cacheable=true)
    public static List<Program__c> getPrograms() {

        return [
            SELECT Id,
                   Name,
                   Program_Type__c,
                   Max_Amount__c,
                   Program_Fund__c,
                   Status__c,
                   Requirements__c,
                   Overview__c
            FROM Program__c
            WHERE Status__c = 'Open'
            ORDER BY CreatedDate DESC
        ];
    }


   @AuraEnabled(cacheable=true)
public static Map<String, Object> getProgramById(Id programId) {

    Program__c programRec = [
        SELECT Id,
               Name,
               Program_Type__c,
               Max_Amount__c,
               Program_Fund__c,
               Status__c,
               Overview__c
        FROM Program__c
        WHERE Id = :programId
        LIMIT 1
    ];

    List<Program_Eligibility__c> eligibilities = [
        SELECT Id, Name
        FROM Program_Eligibility__c
        WHERE Program__c = :programId
    ];

    List<Program_Document__c> documents = [
        SELECT Id, Name, Is_Mandatory__c
        FROM Program_Document__c
        WHERE Program__c = :programId
    ];

    return new Map<String, Object>{
        'program' => programRec,
        'eligibilities' => eligibilities,
        'documents' => documents
    };
}
    
    @AuraEnabled(cacheable=true)
public static List<Program_Document__c> getProgramDocuments(Id programId) {
    return [
        SELECT Id, Name, Is_Mandatory__c
        FROM Program_Document__c
        WHERE Program__c = :programId
    ];
}
}