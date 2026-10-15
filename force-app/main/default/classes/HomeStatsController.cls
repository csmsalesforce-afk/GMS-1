public with sharing class HomeStatsController {
    
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getHomeStats() {
        Map<String, Object> stats = new Map<String, Object>();
        try {
            // 1. Active Programs
            Integer activePrograms = [SELECT count() FROM Program__c WHERE Status__c = 'Open'];
            
            // 2. Applications Submitted
            Integer totalApplications = [SELECT count() FROM Grant_Applicant__c WHERE Application_Status__c != 'Draft'];
            
            // 3. Funded Amount & Total Distributed
            AggregateResult[] ar = [SELECT SUM(Approved_Amount__c) totalFunded FROM Grant_Applicant__c WHERE Application_Status__c = 'Approved' OR Application_Status__c = 'Closed'];
            Decimal totalFunded = (Decimal)ar[0].get('totalFunded');
            if (totalFunded == null) {
                totalFunded = 0;
            }
        
        // Format the amount nicely (e.g. $2.4B, $1.2M, etc.)
        String formattedFunded = formatAmount(totalFunded);
        
        stats.put('activePrograms', activePrograms);
        stats.put('totalApplications', totalApplications);
        stats.put('totalFunded', formattedFunded);
        stats.put('countries', 120);
        
        return stats;
    } catch (Exception e) {
        System.debug('Error in getHomeStats: ' + e.getMessage());
        stats.put('activePrograms', 0);
        stats.put('totalApplications', 0);
        stats.put('totalFunded', '$0');
        stats.put('countries', 0);
        return stats;
    }
}
    
    private static String formatAmount(Decimal amount) {
        if (amount >= 1000000000) {
            return '$' + (amount / 1000000000).setScale(1) + 'B';
        } else if (amount >= 1000000) {
            return '$' + (amount / 1000000).setScale(1) + 'M';
        } else if (amount >= 1000) {
            return '$' + (amount / 1000).setScale(1) + 'K';
        }
        return '$' + amount.setScale(0);
    }
}
