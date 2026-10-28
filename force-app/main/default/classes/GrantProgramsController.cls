public with sharing class GrantProgramsController {

    @AuraEnabled(cacheable=true)
    public static List<Program__c> getPrograms() {
        try {
            return [
                SELECT Id,
                       Name,
                       Program_Type__c,
                       Max_Amount__c,
                       Program_Fund__c,
                       Total_Funded__c,
                       Remaining_Budget__c,
                       Total_Disbursed__c,
                       Status__c,
                       Requirements__c,
                       Overview__c
                FROM Program__c
                WHERE Status__c = 'Open'
                ORDER BY CreatedDate DESC
            ];
        } catch (Exception e) {
            System.debug('Error fetching open programs: ' + e.getMessage());
            return new List<Program__c>();
        }
    }


   @AuraEnabled(cacheable=true)
public static Map<String, Object> getProgramById(Id programId) {

    Program__c programRec = [
        SELECT Id,
               Name,
               Program_Type__c,
               Max_Amount__c,
               Program_Fund__c,
               Total_Funded__c,
               Remaining_Budget__c,
               Total_Disbursed__c,
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
        SELECT Id, Name, Is_Mandatory__c, Applies_To__c, Description__c
        FROM Program_Document__c
        WHERE Program__c = :programId
          AND (Applies_To__c = 'Applicant' OR Applies_To__c = 'Both')
        ORDER BY Is_Mandatory__c DESC, Name ASC
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
        SELECT Id, Name, Is_Mandatory__c, Applies_To__c, Description__c
        FROM Program_Document__c
        WHERE Program__c = :programId
          AND (Applies_To__c = 'Applicant' OR Applies_To__c = 'Both')
        ORDER BY Is_Mandatory__c DESC, Name ASC
    ];
}
}