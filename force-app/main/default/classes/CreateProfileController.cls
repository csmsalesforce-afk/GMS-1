public with sharing class CreateProfileController {

    @AuraEnabled
    public static Id createProfile(Grant_Program__c profileRec) {
        insert profileRec;
        return profileRec.Id;
    }
}