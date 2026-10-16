Grant_Program__c gp = [SELECT Id, Name, First_Name__c, Last_Name__c, Email_Address__c, Donor_Type__c, Organization_Type__c, Primary_Contact_Name__c, Primary_Contact_Email__c, Country__c, Region__c FROM Grant_Program__c WHERE Name = 'P-0101' LIMIT 1];

Id indiaId = [SELECT Id FROM Country__c WHERE Name = 'India' LIMIT 1].Id;
Id apacId = [SELECT Id FROM Region__c WHERE Name = 'Asia-Pacific' LIMIT 1].Id;
Id indAppRtId = Schema.SObjectType.Grant_Program__c.getRecordTypeInfosByDeveloperName().get('Individual_Applicant').getRecordTypeId();

gp.RecordTypeId = indAppRtId;
gp.Organization_Type__c = 'Individual Applicant';
gp.Donor_Type__c = 'Individual';
gp.Primary_Contact_Name__c = 'Arpita Pradhan';
gp.Primary_Contact_Email__c = 'codemicro91+123@gmail.com';
gp.Country__c = indiaId;
gp.Region__c = apacId;

update gp;

System.debug('SUCCESSFULLY UPDATED P-0101: OrgType=' + gp.Organization_Type__c + ', Contact=' + gp.Primary_Contact_Name__c + ', Email=' + gp.Primary_Contact_Email__c + ', Country=' + gp.Country__c + ', Region=' + gp.Region__c);
