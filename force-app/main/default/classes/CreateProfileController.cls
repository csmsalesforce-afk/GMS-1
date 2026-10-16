public without sharing class CreateProfileController {

    @AuraEnabled
    public static Id createProfile(Map<String, Object> profileRec) {
        Grant_Program__c gp = new Grant_Program__c();
        
        profileRec.remove('sobjectType');
        
        String recordId = (String)profileRec.get('Id');
        if (String.isNotBlank(recordId)) {
            List<Grant_Program__c> chk = [SELECT Id, Profile_Status__c FROM Grant_Program__c WHERE Id = :recordId LIMIT 1];
            if (!chk.isEmpty() && chk[0].Profile_Status__c == 'Approved') {
                throw new AuraHandledException('This profile has already been approved by an administrator and cannot be modified.');
            }
            gp.Id = recordId;
        } else if (UserInfo.getUserType() != 'Guest') {
            List<Grant_Program__c> existing = [
                SELECT Id, Country__c, Region__c, Organization_Type__c, RecordTypeId, Profile_Status__c 
                FROM Grant_Program__c 
                WHERE OwnerId = :UserInfo.getUserId() 
                ORDER BY CreatedDate DESC 
                LIMIT 1
            ];
            if (!existing.isEmpty()) {
                if (existing[0].Profile_Status__c == 'Approved') {
                    throw new AuraHandledException('This profile has already been approved by an administrator and cannot be modified.');
                }
                gp.Id = existing[0].Id;
                gp.Country__c = existing[0].Country__c;
                gp.Region__c = existing[0].Region__c;
                gp.Organization_Type__c = existing[0].Organization_Type__c;
                gp.RecordTypeId = existing[0].RecordTypeId;
            }
        }
        
        for (String key : profileRec.keySet()) {
            if (key == 'RecordTypeId' || key == 'Id') continue;
            
            Object val = profileRec.get(key);
            if (val == null || String.valueOf(val).trim() == '') continue;
            
            String strVal = String.valueOf(val).trim();
            
            // 1. SMART LOOKUP RESOLUTION: Country__c
            if (key == 'Country__c') {
                Id resolvedCountryId = null;
                if (strVal.length() == 15 || strVal.length() == 18) {
                    try {
                        resolvedCountryId = (Id)strVal;
                    } catch (Exception ex) {
                        resolvedCountryId = null;
                    }
                }
                if (resolvedCountryId == null) {
                    List<Country__c> cList = [SELECT Id FROM Country__c WHERE Name = :strVal LIMIT 1];
                    if (!cList.isEmpty()) {
                        resolvedCountryId = cList[0].Id;
                    }
                }
                if (resolvedCountryId != null) {
                    gp.Country__c = resolvedCountryId;
                }
                continue;
            }
            
            // 2. SMART LOOKUP RESOLUTION: Region__c
            if (key == 'Region__c') {
                Id resolvedRegionId = null;
                if (strVal.length() == 15 || strVal.length() == 18) {
                    try {
                        resolvedRegionId = (Id)strVal;
                    } catch (Exception ex) {
                        resolvedRegionId = null;
                    }
                }
                if (resolvedRegionId == null) {
                    String queryName = strVal;
                    if (strVal.equalsIgnoreCase('Asia Pacific')) queryName = 'Asia-Pacific';
                    else if (strVal.equalsIgnoreCase('North America')) queryName = 'America';
                    
                    List<Region__c> rList = [SELECT Id FROM Region__c WHERE Name = :queryName OR Name = :strVal LIMIT 1];
                    if (!rList.isEmpty()) {
                        resolvedRegionId = rList[0].Id;
                    }
                }
                if (resolvedRegionId != null) {
                    gp.Region__c = resolvedRegionId;
                }
                continue;
            }
            
            // 3. DONOR TYPE NORMALIZATION
            if (key == 'Donor_Type__c') {
                String dt = strVal;
                if (dt.equalsIgnoreCase('Corporate Foundation')) dt = 'Corporation';
                else if (dt.equalsIgnoreCase('Philanthropic Trust')) dt = 'Foundation';
                else if (dt.equalsIgnoreCase('International NGO') || dt.startsWithIgnoreCase('International NGO')) dt = 'Nonprofit Organization';
                else if (dt.equalsIgnoreCase('Individual Donor')) dt = 'Individual';
                gp.Donor_Type__c = dt;
                continue;
            }
            
            Schema.SObjectField sof = Schema.SObjectType.Grant_Program__c.fields.getMap().get(key);
            if (sof != null) {
                Schema.DescribeFieldResult dfr = sof.getDescribe();
                if (!dfr.isCreateable() && !dfr.isUpdateable()) {
                    continue;
                }
                if (dfr.getType() == Schema.DisplayType.Date) {
                    gp.put(key, Date.valueOf(strVal));
                } else if (dfr.getType() == Schema.DisplayType.Double || dfr.getType() == Schema.DisplayType.Currency || dfr.getType() == Schema.DisplayType.Percent) {
                    gp.put(key, Decimal.valueOf(strVal));
                } else if (dfr.getType() == Schema.DisplayType.Integer) {
                    gp.put(key, Integer.valueOf(strVal));
                } else if (dfr.getType() == Schema.DisplayType.Boolean) {
                    gp.put(key, Boolean.valueOf(val));
                } else {
                    gp.put(key, val);
                }
            }
        }
        
        // 4. AUTO-MAP PRIMARY CONTACT NAME (shown on Approval layout)
        if (String.isBlank(gp.Primary_Contact_Name__c)) {
            String fn = (String)gp.get('First_Name__c');
            String ln = (String)gp.get('Last_Name__c');
            String fullName = ((String.isNotBlank(fn) ? fn : '') + ' ' + (String.isNotBlank(ln) ? ln : '')).trim();
            if (String.isNotBlank(fullName)) {
                gp.Primary_Contact_Name__c = fullName;
            }
        }
        
        // 5. AUTO-MAP PRIMARY CONTACT EMAIL (shown on Approval layout)
        if (String.isBlank(gp.Primary_Contact_Email__c)) {
            String email = (String)gp.get('Email_Address__c');
            if (String.isNotBlank(email)) {
                gp.Primary_Contact_Email__c = email;
            }
        }
        
        // 6. AUTO-MAP ORGANIZATION TYPE FROM DONOR TYPE (shown on Approval layout)
        if (String.isBlank(gp.Organization_Type__c)) {
            String dt = (String)gp.get('Donor_Type__c');
            if (dt == 'Individual') {
                gp.Organization_Type__c = 'Individual Applicant';
            } else if (dt == 'Corporation' || dt == 'Foundation') {
                gp.Organization_Type__c = 'Private Organisation';
            } else if (dt == 'Nonprofit Organization') {
                gp.Organization_Type__c = 'NGO';
            } else {
                gp.Organization_Type__c = 'Individual Applicant';
            }
        }
        
        // 7. RECORD TYPE ASSIGNMENT MATCHING ORGANIZATION TYPE
        String orgType = gp.Organization_Type__c;
        if (orgType != null && gp.RecordTypeId == null) {
            String devName = '';
            if (orgType == 'Academic Institution') devName = 'Academic_Institution';
            else if (orgType == 'Individual Applicant') devName = 'Individual_Applicant';
            else if (orgType == 'NGO') devName = 'NGO';
            else if (orgType == 'Private Organization' || orgType == 'Private Organisation') devName = 'Private_Organisation';
            
            if (String.isNotBlank(devName) && Schema.SObjectType.Grant_Program__c.getRecordTypeInfosByDeveloperName().containsKey(devName)) {
                gp.RecordTypeId = Schema.SObjectType.Grant_Program__c.getRecordTypeInfosByDeveloperName().get(devName).getRecordTypeId();
            }
        }
        
        // 8. AUTO-MAP ACCOUNT (if user is portal user)
        if (gp.Account__c == null && UserInfo.getUserType() != 'Guest') {
            List<User> uList = [SELECT Contact.AccountId FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1];
            if (!uList.isEmpty() && uList[0].Contact != null && uList[0].Contact.AccountId != null) {
                gp.Account__c = uList[0].Contact.AccountId;
            }
        }
        
        if (gp.Id != null) {
            update gp;
        } else {
            insert gp;
        }
        return gp.Id;
    }
}