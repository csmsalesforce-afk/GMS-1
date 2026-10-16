Grant_Program__c gp = [SELECT Id, Name, Profile_Status__c FROM Grant_Program__c WHERE Name = 'P-0101' LIMIT 1];
gp.Profile_Status__c = 'Approved';
update gp;
System.debug('P-0101 STATUS IS NOW: ' + gp.Profile_Status__c);
