List<Donor_Campaign__c> campaigns = [SELECT Id, Name, Expected_Revenue_in_Campaign__c FROM Donor_Campaign__c WHERE Active__c = true];
List<Donations__c> donationsToInsert = new List<Donations__c>();

for (Donor_Campaign__c c : campaigns) {
    if (c.Name.contains('Disaster')) {
        donationsToInsert.add(new Donations__c(
            Donor_Name__c = 'Elena Rostova',
            Donor_Email__c = 'elena.rostova@globalrelief.org',
            Donor_Phone__c = '555-0192',
            Donation_Amount__c = 25000,
            Payment_Status__c = 'Paid',
            Payment_Date__c = Date.today().addDays(-2),
            Donor_Message__c = 'Sending prayers and rapid emergency support for relief efforts.',
            Donor_Campaign__c = c.Id,
            Receipt_Number__c = 'REC-' + String.valueOf(Crypto.getRandomInteger()).replace('-', '').substring(0, 8)
        ));
        donationsToInsert.add(new Donations__c(
            Donor_Name__c = 'Marcus Vance',
            Donor_Email__c = 'mvance@techgives.io',
            Donor_Phone__c = '555-0144',
            Donation_Amount__c = 15000,
            Payment_Status__c = 'Paid',
            Payment_Date__c = Date.today().addDays(-1),
            Donor_Message__c = 'Corporate matching pledge for immediate community shelters.',
            Donor_Campaign__c = c.Id,
            Receipt_Number__c = 'REC-' + String.valueOf(Crypto.getRandomInteger()).replace('-', '').substring(0, 8)
        ));
        donationsToInsert.add(new Donations__c(
            Donor_Name__c = 'Amina Al-Mansoor',
            Donor_Email__c = 'amina@humanityfirst.net',
            Donor_Phone__c = '555-0811',
            Donation_Amount__c = 5000,
            Payment_Status__c = 'Paid',
            Payment_Date__c = Date.today(),
            Donor_Message__c = 'For warm meals and emergency medical kits.',
            Donor_Campaign__c = c.Id,
            Receipt_Number__c = 'REC-' + String.valueOf(Crypto.getRandomInteger()).replace('-', '').substring(0, 8)
        ));
    } else if (c.Name.contains('Transplant')) {
        donationsToInsert.add(new Donations__c(
            Donor_Name__c = 'Dr. Julian Thorne',
            Donor_Email__c = 'jthorne@medpioneers.com',
            Donor_Phone__c = '555-0322',
            Donation_Amount__c = 35000,
            Payment_Status__c = 'Paid',
            Payment_Date__c = Date.today().addDays(-3),
            Donor_Message__c = 'Honoring all pediatric transplant recipients and surgical teams.',
            Donor_Campaign__c = c.Id,
            Receipt_Number__c = 'REC-' + String.valueOf(Crypto.getRandomInteger()).replace('-', '').substring(0, 8)
        ));
        donationsToInsert.add(new Donations__c(
            Donor_Name__c = 'Clara Sterling',
            Donor_Email__c = 'csterling@beaconhealth.org',
            Donor_Phone__c = '555-0754',
            Donation_Amount__c = 20000,
            Payment_Status__c = 'Paid',
            Payment_Date__c = Date.today().addDays(-1),
            Donor_Message__c = 'Every patient deserves a fighting chance. Blessings to the recipients.',
            Donor_Campaign__c = c.Id,
            Receipt_Number__c = 'REC-' + String.valueOf(Crypto.getRandomInteger()).replace('-', '').substring(0, 8)
        ));
        donationsToInsert.add(new Donations__c(
            Donor_Name__c = 'Anonymous Donor',
            Donor_Email__c = 'anonymous.supporter@donorcare.org',
            Donor_Phone__c = '555-0999',
            Donation_Amount__c = 10000,
            Payment_Status__c = 'Paid',
            Payment_Date__c = Date.today(),
            Donor_Message__c = 'Supporting post-operative care and medication grants.',
            Donor_Campaign__c = c.Id,
            Receipt_Number__c = 'REC-' + String.valueOf(Crypto.getRandomInteger()).replace('-', '').substring(0, 8)
        ));
    }
}

if (!donationsToInsert.isEmpty()) {
    insert donationsToInsert;
    System.debug('Inserted ' + donationsToInsert.size() + ' donations successfully.');
}
