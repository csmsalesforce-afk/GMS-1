List<Map<String, Object>> campaigns = DonorPortalController.getActiveCampaigns();
System.debug('Found ' + campaigns.size() + ' active campaigns.');
for (Map<String, Object> c : campaigns) {
    System.debug('Campaign: ' + c.get('name') + ' | Program: ' + c.get('programName') + ' | Goal: $' + c.get('goalAmount'));
}
