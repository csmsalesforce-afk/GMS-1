public with sharing class GrantProgramController {

    @AuraEnabled(cacheable=true)
    public static List<ProgramWrapper> getPrograms(){

        Id userId = UserInfo.getUserId();

        User u = [
            SELECT Profile.Name
            FROM User
            WHERE Id = :userId
        ];

        String profileName = u.Profile.Name;

        List<Program__c> programs = [
            SELECT Id, Name, Program_Fund__c, Status__c
            FROM Program__c
        ];

        Set<Id> programIds = new Set<Id>();

        for(Program__c p : programs){
            programIds.add(p.Id);
        }

        /* Total Applications */

        Map<Id, Integer> totalMap = new Map<Id, Integer>();

        for(AggregateResult ar : [
            SELECT Program__c prog, COUNT(Id) total
            FROM Grant_Applicant__c
            WHERE Program__c IN :programIds
            GROUP BY Program__c
        ]){
            totalMap.put((Id)ar.get('prog'), (Integer)ar.get('total'));
        }

        /* Approved */

        Map<Id, Integer> approvedMap = new Map<Id, Integer>();

        for(AggregateResult ar : [
            SELECT Program__c prog, COUNT(Id) total
            FROM Grant_Applicant__c
            WHERE Program__c IN :programIds
            AND Application_Status__c = 'Approved'
            GROUP BY Program__c
        ]){
            approvedMap.put((Id)ar.get('prog'), (Integer)ar.get('total'));
        }

        /* Rejected */

        Map<Id, Integer> rejectedMap = new Map<Id, Integer>();

        for(AggregateResult ar : [
            SELECT Program__c prog, COUNT(Id) total
            FROM Grant_Applicant__c
            WHERE Program__c IN :programIds
            AND Application_Status__c = 'Rejected'
            GROUP BY Program__c
        ]){
            rejectedMap.put((Id)ar.get('prog'), (Integer)ar.get('total'));
        }

        /* Pending based on role */

        String pendingStatus;

        if(profileName == 'Finance'){
            pendingStatus = 'Revision Requested';
        }
        else if(profileName == 'Program Officer'){
            pendingStatus = 'Under External Review';
        }
        else if(profileName == 'Reviewer'){
            pendingStatus = 'Under Internal Review';
        }

        Map<Id, Integer> pendingMap = new Map<Id, Integer>();

        if(pendingStatus != null){

            for(AggregateResult ar : [
                SELECT Program__c prog, COUNT(Id) total
                FROM Grant_Applicant__c
                WHERE Program__c IN :programIds
                AND Application_Status__c = :pendingStatus
                GROUP BY Program__c
            ]){
                pendingMap.put((Id)ar.get('prog'), (Integer)ar.get('total'));
            }
        }

        List<ProgramWrapper> result = new List<ProgramWrapper>();

        for(Program__c p : programs){

            ProgramWrapper w = new ProgramWrapper();

            w.programId = p.Id;
            w.programName = p.Name;
            w.totalBudget = p.Program_Fund__c;
            w.status = p.Status__c;

            w.totalApplications = totalMap.containsKey(p.Id) ? totalMap.get(p.Id) : 0;
            w.approved = approvedMap.containsKey(p.Id) ? approvedMap.get(p.Id) : 0;
            w.rejected = rejectedMap.containsKey(p.Id) ? rejectedMap.get(p.Id) : 0;
            w.pending = pendingMap.containsKey(p.Id) ? pendingMap.get(p.Id) : 0;

            result.add(w);
        }

        return result;
    }


    public class ProgramWrapper{
        @AuraEnabled public Id programId;
        @AuraEnabled public String programName;
        @AuraEnabled public Decimal totalBudget;
        @AuraEnabled public Integer totalApplications;
        @AuraEnabled public Integer pending;
        @AuraEnabled public Integer approved;
        @AuraEnabled public Integer rejected;
        @AuraEnabled public String status;
    }
    
@AuraEnabled(cacheable=true)
public static List<Grant_Applicant__c> getApplicationsByProgram(Id programId){

    User u = [
        SELECT Profile.Name
        FROM User
        WHERE Id = :UserInfo.getUserId()
    ];

    String profileName = u.Profile.Name;

    String statusFilter;

    if(profileName == 'Reviewer'){
        statusFilter = 'Under Internal Review';
    }
    else if(profileName == 'Program Officer'){
        statusFilter = 'Under External Review';
    }
    else if(profileName == 'Finance'){
        statusFilter = 'Revision Requested';
    }

    List<Grant_Applicant__c> apps;

    if(statusFilter != null){

        apps = [
            SELECT Id,
                   Name,
                   Account__r.Name,
                   Requested_Amount__c,
                   Application_Status__c,
                   CreatedDate
            FROM Grant_Applicant__c
            WHERE Program__c = :programId
            AND Application_Status__c = :statusFilter
            ORDER BY CreatedDate DESC
        ];
    }
    else{

        // Admin or other roles
        apps = [
            SELECT Id,
                   Name,
                   Account__r.Name,
                   Requested_Amount__c,
                   Application_Status__c,
                   CreatedDate
            FROM Grant_Applicant__c
            WHERE Program__c = :programId
            ORDER BY CreatedDate DESC
        ];
    }

    return apps;
}
}