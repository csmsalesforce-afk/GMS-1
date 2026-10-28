public without sharing class DonationsTriggerHandler {

    public static void handleAfterInsert(List<Donations__c> newList) {
        processPaidDonations(newList, null);
    }

    public static void handleAfterUpdate(List<Donations__c> newList, Map<Id, Donations__c> oldMap) {
        processPaidDonations(newList, oldMap);
    }

    private static void processPaidDonations(List<Donations__c> newList, Map<Id, Donations__c> oldMap) {
        Set<Id> campaignIdsToRecalculate = new Set<Id>();
        List<Donations__c> paidDonationsNeedingDonor = new List<Donations__c>();

        for (Donations__c d : newList) {
            Boolean isNowPaid = (d.Payment_Status__c == 'Paid');
            Boolean wasPaid = (oldMap != null && oldMap.containsKey(d.Id) && oldMap.get(d.Id).Payment_Status__c == 'Paid');

            if (isNowPaid && !wasPaid) {
                if (d.Donor_Campaign__c != null) {
                    campaignIdsToRecalculate.add(d.Donor_Campaign__c);
                }
                if (d.Donor__c == null && String.isNotBlank(d.Donor_Email__c)) {
                    paidDonationsNeedingDonor.add(d);
                }
            } else if (oldMap != null && d.Donor_Campaign__c != oldMap.get(d.Id).Donor_Campaign__c) {
                if (d.Donor_Campaign__c != null) campaignIdsToRecalculate.add(d.Donor_Campaign__c);
                if (oldMap.get(d.Id).Donor_Campaign__c != null) campaignIdsToRecalculate.add(oldMap.get(d.Id).Donor_Campaign__c);
            }
        }

        // 1. Link / Create Donor__c records
        if (!paidDonationsNeedingDonor.isEmpty()) {
            linkOrCreateDonors(paidDonationsNeedingDonor);
        }

        // 2. Recalculate Campaign & Program Funds
        if (!campaignIdsToRecalculate.isEmpty()) {
            recalculateCampaignsAndPrograms(campaignIdsToRecalculate);
        }
    }

    /**
     * Finds existing Donor__c records matching by email or creates new ones, then links them.
     */
    private static void linkOrCreateDonors(List<Donations__c> donations) {
        Set<String> emails = new Set<String>();
        for (Donations__c d : donations) {
            emails.add(d.Donor_Email__c.trim().toLowerCase());
        }

        Map<String, Donor__c> existingDonors = new Map<String, Donor__c>();
        for (Donor__c donor : [SELECT Id, Email__c FROM Donor__c WHERE Email__c IN :emails]) {
            if (String.isNotBlank(donor.Email__c)) {
                existingDonors.put(donor.Email__c.toLowerCase(), donor);
            }
        }

        List<Donor__c> newDonorsToInsert = new List<Donor__c>();
        Map<String, Donor__c> pendingNewDonors = new Map<String, Donor__c>();

        for (Donations__c d : donations) {
            String emailKey = d.Donor_Email__c.trim().toLowerCase();
            if (!existingDonors.containsKey(emailKey) && !pendingNewDonors.containsKey(emailKey)) {
                Donor__c newDonor = new Donor__c(
                    Donor_Name__c = String.isNotBlank(d.Donor_Name__c) ? d.Donor_Name__c : 'Supporter',
                    Email__c = d.Donor_Email__c.trim(),
                    Contact_Number__c = d.Donor_Phone__c,
                    Status__c = 'Active'
                );
                pendingNewDonors.put(emailKey, newDonor);
                newDonorsToInsert.add(newDonor);
            }
        }

        if (!newDonorsToInsert.isEmpty()) {
            insert newDonorsToInsert;
            for (Donor__c d : newDonorsToInsert) {
                if (String.isNotBlank(d.Email__c)) {
                    existingDonors.put(d.Email__c.toLowerCase(), d);
                }
            }
        }

        // Update donations with Donor lookup
        List<Donations__c> donationsToUpdate = new List<Donations__c>();
        for (Donations__c d : donations) {
            String emailKey = d.Donor_Email__c.trim().toLowerCase();
            if (existingDonors.containsKey(emailKey)) {
                donationsToUpdate.add(new Donations__c(
                    Id = d.Id,
                    Donor__c = existingDonors.get(emailKey).Id
                ));
            }
        }

        if (!donationsToUpdate.isEmpty()) {
            update donationsToUpdate;
        }
    }

    /**
     * Aggregates total paid donations for campaigns and rolls up into Donor_Campaign__c and Program__c
     */
    public static void recalculateCampaignsAndPrograms(Set<Id> campaignIds) {
        if (campaignIds == null || campaignIds.isEmpty()) return;

        Map<Id, Donor_Campaign__c> campaignsMap = new Map<Id, Donor_Campaign__c>([
            SELECT Id, Program__c, Total_Raised__c, Total_Donors_Count__c
            FROM Donor_Campaign__c
            WHERE Id IN :campaignIds
        ]);

        // Aggregate Donations per Campaign
        AggregateResult[] agg = [
            SELECT Donor_Campaign__c campId, SUM(Donation_Amount__c) totalAmount, COUNT(Id) donorCount
            FROM Donations__c
            WHERE Donor_Campaign__c IN :campaignIds AND Payment_Status__c = 'Paid'
            GROUP BY Donor_Campaign__c
        ];

        Map<Id, Decimal> raisedTotals = new Map<Id, Decimal>();
        Map<Id, Integer> donorCounts = new Map<Id, Integer>();

        for (AggregateResult ar : agg) {
            Id campId = (Id)ar.get('campId');
            Decimal total = (Decimal)ar.get('totalAmount');
            Integer countVal = (Integer)ar.get('donorCount');
            raisedTotals.put(campId, total != null ? total : 0);
            donorCounts.put(campId, countVal != null ? countVal : 0);
        }

        List<Donor_Campaign__c> campaignsToUpdate = new List<Donor_Campaign__c>();
        Set<Id> programIds = new Set<Id>();

        for (Id campId : campaignIds) {
            Donor_Campaign__c camp = campaignsMap.get(campId);
            if (camp != null) {
                camp.Total_Raised__c = raisedTotals.containsKey(campId) ? raisedTotals.get(campId) : 0;
                camp.Total_Donors_Count__c = donorCounts.containsKey(campId) ? donorCounts.get(campId) : 0;
                campaignsToUpdate.add(camp);

                if (camp.Program__c != null) {
                    programIds.add(camp.Program__c);
                }
            }
        }

        if (!campaignsToUpdate.isEmpty()) {
            update campaignsToUpdate;
        }

        // Recalculate Programs total raised from all active campaigns
        if (!programIds.isEmpty()) {
            recalculatePrograms(programIds);
        }
    }

    /**
     * Rolls up all campaign donations into the parent Program__c budget/funded amounts
     */
    public static void recalculatePrograms(Set<Id> programIds) {
        if (programIds == null || programIds.isEmpty()) return;

        AggregateResult[] programAgg = [
            SELECT Donor_Campaign__r.Program__c progId, SUM(Donation_Amount__c) totalAmount
            FROM Donations__c
            WHERE Donor_Campaign__r.Program__c IN :programIds AND Payment_Status__c = 'Paid'
            GROUP BY Donor_Campaign__r.Program__c
        ];

        Map<Id, Decimal> programDonationTotals = new Map<Id, Decimal>();
        for (AggregateResult ar : programAgg) {
            Id progId = (Id)ar.get('progId');
            Decimal total = (Decimal)ar.get('totalAmount');
            programDonationTotals.put(progId, total != null ? total : 0);
        }

        List<Program__c> programsToUpdate = [
            SELECT Id, Program_Fund__c, Total_Funded__c
            FROM Program__c
            WHERE Id IN :programIds
        ];

        for (Program__c p : programsToUpdate) {
            Decimal campaignDonation = programDonationTotals.containsKey(p.Id) ? programDonationTotals.get(p.Id) : 0;
            // Update Total_Funded__c with total amount raised from paid donations
            p.Total_Funded__c = campaignDonation;
        }

        if (!programsToUpdate.isEmpty()) {
            update programsToUpdate;
        }
    }
}
