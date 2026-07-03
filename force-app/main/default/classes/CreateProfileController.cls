public without sharing class CreateProfileController {

    @AuraEnabled
    public static Id createProfile(Map<String, Object> profileRec) {
        Grant_Program__c gp = new Grant_Program__c();
        
        profileRec.remove('sobjectType');
        
        String orgType = (String)profileRec.get('Organization_Type__c');
        if (orgType != null) {
            String devName = '';
            if (orgType == 'Academic Institution') devName = 'Academic_Institution';
            else if (orgType == 'Individual Applicant') devName = 'Individual_Applicant';
            else if (orgType == 'NGO') devName = 'NGO';
            else if (orgType == 'Private Organization' || orgType == 'Private Organisation') devName = 'Private_Organisation';
            
            if (String.isNotBlank(devName)) {
                gp.RecordTypeId = Schema.SObjectType.Grant_Program__c.getRecordTypeInfosByDeveloperName().get(devName).getRecordTypeId();
            }
        }
        
        for (String key : profileRec.keySet()) {
            if (key == 'RecordTypeId' || key == 'Id') continue;
            
            Object val = profileRec.get(key);
            if (val != null && val != '') {
                Schema.SObjectField sof = Schema.SObjectType.Grant_Program__c.fields.getMap().get(key);
                if (sof != null) {
                    Schema.DescribeFieldResult dfr = sof.getDescribe();
                    if (dfr.getType() == Schema.DisplayType.Date) {
                        gp.put(key, Date.valueOf(String.valueOf(val)));
                    } else if (dfr.getType() == Schema.DisplayType.Double || dfr.getType() == Schema.DisplayType.Currency || dfr.getType() == Schema.DisplayType.Percent) {
                        gp.put(key, Decimal.valueOf(String.valueOf(val)));
                    } else if (dfr.getType() == Schema.DisplayType.Integer) {
                        gp.put(key, Integer.valueOf(String.valueOf(val)));
                    } else {
                        gp.put(key, val);
                    }
                }
            }
        }
        
        insert gp;
        return gp.Id;
    }
}