@IsTest
public class DonorPortalControllerTest {

    @TestSetup
    static void setupTestData() {
        // Create Program
        Program__c prog = new Program__c(
            Program_Fund__c = 500000,
            Status__c = 'Open'
        );
        insert prog;

        // Create Donor Campaign
        Donor_Campaign__c camp = new Donor_Campaign__c(
            Name = 'Test Clean Water Campaign',
            Program__c = prog.Id,
            Active__c = true,
            Expected_Revenue_in_Campaign__c = 50000,
            Status__c = 'In Progress'
        );
        insert camp;
    }

    @IsTest
    static void testGetActiveCampaignsAndStats() {
        Test.startTest();
        List<Map<String, Object>> campaigns = DonorPortalController.getActiveCampaigns();
        Map<String, Object> stats = DonorPortalController.getDonorPlatformStats();
        Test.stopTest();

        System.assertNotEquals(0, campaigns.size(), 'Should return active campaigns');
        System.assertNotEquals(null, stats.get('activeCampaigns'), 'Should return stats');
    }

    @IsTest
    static void testSubmitDonationAndTrigger() {
        Donor_Campaign__c camp = [SELECT Id FROM Donor_Campaign__c LIMIT 1];

        Map<String, Object> payload = new Map<String, Object>{
            'campaignId' => camp.Id,
            'amount' => 150.00,
            'donorName' => 'Alice Donor',
            'donorEmail' => 'alice@example.com',
            'donorPhone' => '555-1234',
            'donorMessage' => 'Happy to support!',
            'stripeSessionId' => 'sess_123',
            'stripePaymentIntentId' => 'pi_123'
        };

        Test.startTest();
        Map<String, Object> result = DonorPortalController.submitDonation(payload);
        Map<String, Object> details = DonorPortalController.getCampaignDetails(camp.Id);
        Test.stopTest();

        System.assertEquals(true, result.get('success'), 'Donation should be successful');
        System.assertNotEquals(null, result.get('receiptNumber'), 'Receipt number must be generated');

        // Verify Donor__c auto-creation and link
        Donor__c createdDonor = [SELECT Id, Donor_Name__c FROM Donor__c WHERE Email__c = 'alice@example.com' LIMIT 1];
        System.assertEquals('Alice Donor', createdDonor.Donor_Name__c);

        // Verify Campaign Rollup
        Donor_Campaign__c updatedCamp = [SELECT Total_Raised__c, Total_Donors_Count__c FROM Donor_Campaign__c WHERE Id = :camp.Id];
        System.assertEquals(150.00, updatedCamp.Total_Raised__c);
        System.assertEquals(1, updatedCamp.Total_Donors_Count__c);
    }

    @IsTest
    static void testSubmitLeadInquiry() {
        Map<String, Object> inquiry = new Map<String, Object>{
            'firstName' => 'John',
            'lastName' => 'Doe',
            'company' => 'Acme Corp',
            'email' => 'john@acme.com',
            'phone' => '123-456-7890',
            'message' => 'Interested in corporate matching',
            'campaignName' => 'Test Campaign',
            'estimatedPledge' => '$10,000'
        };

        Test.startTest();
        Map<String, Object> result = DonorPortalController.submitLeadInquiry(inquiry);
        Test.stopTest();

        System.assertEquals(true, result.get('success'), 'Lead inquiry should succeed');
        Lead createdLead = [SELECT Id, Company FROM Lead WHERE Email = 'john@acme.com' LIMIT 1];
        System.assertEquals('Acme Corp', createdLead.Company);
    }

    @IsTest
    static void testGetDonorProfileStatusAndSubmit() {
        // Create an active donor record
        Donor__c d = new Donor__c(
            Donor_Name__c = 'Test Donor Org',
            Donor_Type__c = 'Corporate',
            Email__c = UserInfo.getUserEmail(),
            Status__c = 'Active',
            User__c = UserInfo.getUserId(),
            Compliance_Status__c = 'Approved',
            KYC_Verified__c = true
        );
        insert d;

        Test.startTest();
        Map<String, Object> statusMap = DonorPortalController.getDonorProfileStatus();
        System.assertEquals('Approved', statusMap.get('status'), 'Should be Approved for active donor record');
        System.assertEquals(true, statusMap.get('kycVerified'), 'KYC should be verified');
        System.assertEquals(d.Id, statusMap.get('donorId'), 'Should return correct donor record Id');

        // Test submitDonorProfile
        Map<String, Object> profilePayload = new Map<String, Object>{
            'donorName' => 'Updated Donor Org',
            'donorType' => 'Corporate',
            'email' => UserInfo.getUserEmail(),
            'phone' => '1234567890',
            'address' => '123 Test Ave',
            'preferredFundingType' => 'Mixed',
            'fundingCapacity' => 10000
        };
        Map<String, Object> submitResult = DonorPortalController.submitDonorProfile(profilePayload);
        Test.stopTest();

        System.assertEquals(true, submitResult.get('success'), 'Profile submission should succeed');
        System.assertEquals(d.Id, submitResult.get('donorId'), 'Should update existing donor record rather than duplicate');
    }
}
