List<ProfileFieldSetController.FieldMetadata> meta = ProfileFieldSetController.getFieldSetMetadata('Donor');
System.debug('META_COUNT: ' + meta.size());
for(ProfileFieldSetController.FieldMetadata f : meta){
    System.debug('FIELD: ' + f.name + ' type=' + f.type + ' options=' + (f.options != null ? f.options.size() : 0));
    if (f.options != null) {
        for(ProfileFieldSetController.Option opt : f.options) {
            System.debug('  OPT for ' + f.name + ': ' + opt.label + ' -> ' + opt.value);
        }
    }
}
