public without sharing class ProfileFieldSetController {

    @AuraEnabled(cacheable=true)
    public static List<String> getFieldSetFields(String fieldSetName) {

        if(String.isBlank(fieldSetName)){
            return new List<String>();
        }

        Map<String, Schema.FieldSet> fieldSetMap =
            Grant_Program__c.SObjectType.getDescribe().fieldSets.getMap();

        if(!fieldSetMap.containsKey(fieldSetName)){
            return new List<String>();
        }

        List<String> fields = new List<String>();

        for(Schema.FieldSetMember f :
            fieldSetMap.get(fieldSetName).getFields()){

            fields.add(f.getFieldPath());
        }

        return fields;
    }

    public class Option {
        @AuraEnabled public String label;
        @AuraEnabled public String value;
        public Option() {}
        public Option(String l, String v) { label = l; value = v; }
    }

    public class FieldMetadata {
        @AuraEnabled public String name;
        @AuraEnabled public String label;
        @AuraEnabled public String type;
        @AuraEnabled public Boolean required;
        @AuraEnabled public List<Option> options;
        public FieldMetadata() {
            this.options = new List<Option>();
            this.required = false;
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<FieldMetadata> getFieldSetMetadata(String fieldSetName) {
        if(String.isBlank(fieldSetName)){
            return new List<FieldMetadata>();
        }

        try {
            Map<String, Schema.FieldSet> fieldSetMap =
                Grant_Program__c.SObjectType.getDescribe().fieldSets.getMap();

            Schema.FieldSet targetFieldSet = null;
            if (fieldSetMap.containsKey(fieldSetName)) {
                targetFieldSet = fieldSetMap.get(fieldSetName);
            } else {
                for (String k : fieldSetMap.keySet()) {
                    if (k.equalsIgnoreCase(fieldSetName)) {
                        targetFieldSet = fieldSetMap.get(k);
                        break;
                    }
                }
            }

            if(targetFieldSet == null){
                return new List<FieldMetadata>();
            }

            List<FieldMetadata> fields = new List<FieldMetadata>();

            for(Schema.FieldSetMember f : targetFieldSet.getFields()){
                if (f.getSObjectField() == null) {
                    continue;
                }
                Schema.DescribeFieldResult dfr = f.getSObjectField().getDescribe();
                
                String path = f.getFieldPath();
                if (path == 'OwnerId' || path == 'Id' || path == 'RecordTypeId' || path == 'CreatedById' || 
                    path == 'LastModifiedById' || path == 'SystemModstamp' || path.toLowerCase().contains('stripe')) {
                    continue;
                }

                FieldMetadata md = new FieldMetadata();
                md.name = path;
                md.label = f.getLabel();
                
                Schema.DisplayType t = f.getType();
                if (t == Schema.DisplayType.Picklist) {
                    md.type = 'select';
                    md.options = new List<Option>();
                    for (Schema.PicklistEntry pe : dfr.getPicklistValues()) {
                        if (pe.isActive()) {
                            md.options.add(new Option(pe.getLabel(), pe.getValue()));
                        }
                    }
                } else if (t == Schema.DisplayType.Reference) {
                    md.type = 'select';
                    md.options = new List<Option>();
                    try {
                        List<Schema.SObjectType> refs = dfr.getReferenceTo();
                        if (refs != null && !refs.isEmpty()) {
                            Schema.SObjectType targetType = refs[0];
                            String targetName = targetType.getDescribe().getName();
                            String q = 'SELECT Id, Name FROM ' + String.escapeSingleQuotes(targetName) + ' ORDER BY Name ASC LIMIT 1000';
                            for (SObject sobj : Database.query(q)) {
                                md.options.add(new Option((String)sobj.get('Name'), (String)sobj.get('Id')));
                            }
                        }
                    } catch (Exception e) {
                        System.debug('Failed to load lookup options for ' + path + ': ' + e.getMessage());
                    }
                } else if (t == Schema.DisplayType.Email) md.type = 'email';
                else if (t == Schema.DisplayType.Double || t == Schema.DisplayType.Integer || t == Schema.DisplayType.Percent || t == Schema.DisplayType.Currency) md.type = 'number';
                else if (t == Schema.DisplayType.Date) md.type = 'date';
                else md.type = 'text';

                md.required = f.getRequired() || f.getDbRequired();
                fields.add(md);
            }

            return fields;
        } catch (Exception ex) {
            System.debug('Error in getFieldSetMetadata: ' + ex.getMessage() + ' ' + ex.getStackTraceString());
            return new List<FieldMetadata>();
        }
    }

    // Existing method (KEEP AS IS)
    @AuraEnabled(cacheable=true)
    public static Grant_Program__c getCurrentUserProfile() {
        
        List<String> allFields = new List<String>(Grant_Program__c.SObjectType.getDescribe().fields.getMap().keySet());
        
        String query = 'SELECT ' + String.join(allFields, ',') + 
                       ', Country__r.Name, Region__r.Name, Owner.Name ' +
                       'FROM Grant_Program__c ' +
                       'WHERE OwnerId = \'' + UserInfo.getUserId() + '\' ' +
                       'LIMIT 1';
        
        List<Grant_Program__c> profiles = Database.query(query);
        return profiles.isEmpty() ? null : profiles[0];
    }

    //  NEW METHOD FOR NAVBAR
    @AuraEnabled(cacheable=true)
    public static User getLoggedInUserProfile(){

        return [
            SELECT Id,
                   Name,
                   Profile.Name
            FROM User
            WHERE Id = :UserInfo.getUserId()
        ];
    }

    @AuraEnabled
    public static void submitProfileForApproval(Id recordId) {

        Approval.ProcessSubmitRequest req = new Approval.ProcessSubmitRequest();
        req.setObjectId(recordId);

        Approval.ProcessResult result = Approval.process(req);

        if (!result.isSuccess()) {
            throw new AuraHandledException('Unable to submit for approval.');
        }
    }
}