Grant_Program__c gp = [SELECT Id, Name, RecordTypeId, RecordType.Name, RecordType.DeveloperName FROM Grant_Program__c WHERE Name = 'P-0101' LIMIT 1];
System.debug('P0101 RT=' + gp.RecordType.DeveloperName);

for(Schema.PicklistEntry pe : Grant_Program__c.Organization_Type__c.getDescribe().getPicklistValues()){
    System.debug('ORG_TYPE ENTRY: ' + pe.getValue() + ' / ' + pe.getLabel() + ' active=' + pe.isActive());
}
