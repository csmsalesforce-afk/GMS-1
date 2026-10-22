Map<String, Program__c> programsByName = new Map<String, Program__c>();
for (Program__c p : [SELECT Id, Name, Program_Type__c FROM Program__c]) {
    programsByName.put(p.Name, p);
}

List<Donor_Campaign__c> newCampaigns = new List<Donor_Campaign__c>();

// 1. Digital Literacy & STEM Education
if (programsByName.containsKey('Digital Literacy Program')) {
    Program__c p = programsByName.get('Digital Literacy Program');
    newCampaigns.add(new Donor_Campaign__c(
        Name = 'Digital Literacy & Rural Classroom Initiative',
        Program__c = p.Id,
        Active__c = true,
        Status__c = 'In Progress',
        Expected_Revenue_in_Campaign__c = 75000,
        Start_Date__c = Date.today().addDays(-30),
        End_Date__c = Date.today().addDays(150),
        Description__c = 'Providing laptops, high-speed internet, and interactive STEM training kits for underprivileged community schools and rural classrooms.'
    ));
}

// 2. Women & Child Welfare
if (programsByName.containsKey('Women & Child Welfare Support Program')) {
    Program__c p = programsByName.get('Women & Child Welfare Support Program');
    newCampaigns.add(new Donor_Campaign__c(
        Name = 'Maternal Health & Child Welfare Fund',
        Program__c = p.Id,
        Active__c = true,
        Status__c = 'In Progress',
        Expected_Revenue_in_Campaign__c = 120000,
        Start_Date__c = Date.today().addDays(-20),
        End_Date__c = Date.today().addDays(160),
        Description__c = 'Comprehensive nutritional support, maternal care kits, and girl child educational scholarships for vulnerable community households.'
    ));
}

// 3. Rural Infrastructure & Clean Water
if (programsByName.containsKey('Rural Community Infrastructure Development')) {
    Program__c p = programsByName.get('Rural Community Infrastructure Development');
    newCampaigns.add(new Donor_Campaign__c(
        Name = 'Clean Water Wells & Rural Infrastructure Fund',
        Program__c = p.Id,
        Active__c = true,
        Status__c = 'In Progress',
        Expected_Revenue_in_Campaign__c = 90000,
        Start_Date__c = Date.today().addDays(-40),
        End_Date__c = Date.today().addDays(140),
        Description__c = 'Constructing solar-powered clean water filtration boreholes and community sanitation hubs across remote agricultural villages.'
    ));
}

// 4. Vocational & Youth Skill Building
if (programsByName.containsKey('Skill Enhancement & Capacity Building Initiative')) {
    Program__c p = programsByName.get('Skill Enhancement & Capacity Building Initiative');
    newCampaigns.add(new Donor_Campaign__c(
        Name = 'Youth Vocational Skills & Job Readiness Drive',
        Program__c = p.Id,
        Active__c = true,
        Status__c = 'In Progress',
        Expected_Revenue_in_Campaign__c = 60000,
        Start_Date__c = Date.today().addDays(-15),
        End_Date__c = Date.today().addDays(165),
        Description__c = 'Vocational apprenticeship certifications, technical tools, and career incubation for youth and marginalized workers.'
    ));
}

// 5. Sustainable Livelihood Support
if (programsByName.containsKey('Sustainable Livelihood Support Program')) {
    Program__c p = programsByName.get('Sustainable Livelihood Support Program');
    newCampaigns.add(new Donor_Campaign__c(
        Name = 'Sustainable Farming & Micro-Enterprise Grants',
        Program__c = p.Id,
        Active__c = true,
        Status__c = 'In Progress',
        Expected_Revenue_in_Campaign__c = 50000,
        Start_Date__c = Date.today().addDays(-25),
        End_Date__c = Date.today().addDays(155),
        Description__c = 'Seed grants, climate-smart farming kits, and micro-loan guarantees to help families establish self-sustaining livelihoods.'
    ));
}

// 6. Scientific Research & Oncology
if (programsByName.containsKey('Cancer Vaccine Research Program')) {
    Program__c p = programsByName.get('Cancer Vaccine Research Program');
    newCampaigns.add(new Donor_Campaign__c(
        Name = 'Cancer Vaccine & Translational Oncology Research',
        Program__c = p.Id,
        Active__c = true,
        Status__c = 'In Progress',
        Expected_Revenue_in_Campaign__c = 200000,
        Start_Date__c = Date.today().addDays(-60),
        End_Date__c = Date.today().addDays(120),
        Description__c = 'Pioneering laboratory grants and clinical trial support for non-toxic cellular cancer vaccines and targeted immunotherapy.'
    ));
}

if (!newCampaigns.isEmpty()) {
    insert newCampaigns;
    System.debug('Inserted ' + newCampaigns.size() + ' diverse campaigns.');

    // Seed realistic donations for these new campaigns
    List<Donations__c> donations = new List<Donations__c>();
    for (Donor_Campaign__c c : newCampaigns) {
        if (c.Name.contains('Digital Literacy')) {
            donations.add(new Donations__c(
                Donor_Name__c = 'Priya Natarajan',
                Donor_Email__c = 'priya.natarajan@techforall.org',
                Donor_Phone__c = '555-0671',
                Donation_Amount__c = 32000,
                Payment_Status__c = 'Paid',
                Payment_Date__c = Date.today().addDays(-5),
                Donor_Message__c = 'Empowering every girl and boy with computer literacy.',
                Donor_Campaign__c = c.Id,
                Receipt_Number__c = 'REC-' + String.valueOf(Crypto.getRandomInteger()).replace('-', '').substring(0, 8)
            ));
        } else if (c.Name.contains('Clean Water')) {
            donations.add(new Donations__c(
                Donor_Name__c = 'Liam Gallagher',
                Donor_Email__c = 'liam@aquavita.org',
                Donor_Phone__c = '555-0422',
                Donation_Amount__c = 48000,
                Payment_Status__c = 'Paid',
                Payment_Date__c = Date.today().addDays(-8),
                Donor_Message__c = 'Safe drinking water is a fundamental human right.',
                Donor_Campaign__c = c.Id,
                Receipt_Number__c = 'REC-' + String.valueOf(Crypto.getRandomInteger()).replace('-', '').substring(0, 8)
            ));
        } else if (c.Name.contains('Maternal Health')) {
            donations.add(new Donations__c(
                Donor_Name__c = 'Sophia Chen',
                Donor_Email__c = 'sophia.chen@mothershope.org',
                Donor_Phone__c = '555-0899',
                Donation_Amount__c = 55000,
                Payment_Status__c = 'Paid',
                Payment_Date__c = Date.today().addDays(-2),
                Donor_Message__c = 'Supporting safe childbirth and infant care in rural centers.',
                Donor_Campaign__c = c.Id,
                Receipt_Number__c = 'REC-' + String.valueOf(Crypto.getRandomInteger()).replace('-', '').substring(0, 8)
            ));
        } else if (c.Name.contains('Vocational')) {
            donations.add(new Donations__c(
                Donor_Name__c = 'Devon Reynolds',
                Donor_Email__c = 'dreynolds@workforceguild.com',
                Donor_Phone__c = '555-0155',
                Donation_Amount__c = 28000,
                Payment_Status__c = 'Paid',
                Payment_Date__c = Date.today().addDays(-4),
                Donor_Message__c = 'Vocational education breaks poverty cycles forever.',
                Donor_Campaign__c = c.Id,
                Receipt_Number__c = 'REC-' + String.valueOf(Crypto.getRandomInteger()).replace('-', '').substring(0, 8)
            ));
        } else if (c.Name.contains('Sustainable Farming')) {
            donations.add(new Donations__c(
                Donor_Name__c = 'Ananya Patel',
                Donor_Email__c = 'ananya@greengrounds.io',
                Donor_Phone__c = '555-0377',
                Donation_Amount__c = 22000,
                Payment_Status__c = 'Paid',
                Payment_Date__c = Date.today().addDays(-3),
                Donor_Message__c = 'For regenerative seeds and sustainable village enterprise.',
                Donor_Campaign__c = c.Id,
                Receipt_Number__c = 'REC-' + String.valueOf(Crypto.getRandomInteger()).replace('-', '').substring(0, 8)
            ));
        } else if (c.Name.contains('Cancer Vaccine')) {
            donations.add(new Donations__c(
                Donor_Name__c = 'Dr. Robert Zimmerman',
                Donor_Email__c = 'rzimmerman@cureforward.org',
                Donor_Phone__c = '555-0912',
                Donation_Amount__c = 95000,
                Payment_Status__c = 'Paid',
                Payment_Date__c = Date.today().addDays(-12),
                Donor_Message__c = 'Accelerating translational immunotherapy research to cure cancer.',
                Donor_Campaign__c = c.Id,
                Receipt_Number__c = 'REC-' + String.valueOf(Crypto.getRandomInteger()).replace('-', '').substring(0, 8)
            ));
        }
    }

    if (!donations.isEmpty()) {
        insert donations;
        System.debug('Inserted ' + donations.size() + ' donations for new diverse campaigns.');
    }
}
