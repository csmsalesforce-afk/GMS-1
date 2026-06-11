import { LightningElement, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation'; // Import NavigationMixin

export default class AllProgramsList extends NavigationMixin(LightningElement) {
    @track programs = [];
    @track isLoading = true;

    connectedCallback() {
        this.fetchAllPrograms();
    }

    // --- NEW BACK BUTTON LOGIC ---
    handleBack() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'Home' // This navigates back to the default Community Home Page
            }
        });
    }

    fetchAllPrograms() {
        const endpoint = 'https://orgfarm-4e9caeff63-dev-ed.develop.my.site.com/gmsa/services/apexrest/programs';

        fetch(endpoint)
            .then(response => response.json())
            .then(data => {
                this.programs = data.map(item => {
                    return {
                        id: item.Id,
                        title: item.Name,
                        category: item.Program_Type__c,
                        // Update this line to use the new formatter method
                        amount: this.formatCurrency(item.Max_Amount__c), 
                        icon: this.getIconByCategory(item.Program_Type__c)
                    };
                });
                this.isLoading = false;
            })
            .catch(error => {
                console.error('Error fetching programs:', error);
                this.isLoading = false;
            });
    }

    // Add this helper method right below fetchAllPrograms
formatCurrency(value) {
    if (!value || isNaN(value)) return '$0';

    // Billions (1,000,000,000 and above)
    if (value >= 1000000000) {
        return '$' + parseFloat((value / 1000000000).toFixed(2)) + ' B';
    } 
    // Millions (1,000,000 to 999,999,999)
    else if (value >= 1000000) {
        return '$' + parseFloat((value / 1000000).toFixed(2)) + ' M';
    } 
    // Thousands (1,000 to 999,999)
    else if (value >= 1000) {
        return '$' + parseFloat((value / 1000).toFixed(2)) + ' K';
    }
    
    // Less than 1,000
    return '$' + value;
}
    getIconByCategory(category) {
        if (!category) return 'utility:apps';
        const cat = category.toLowerCase();
        if (cat.includes('health')) return 'standard:medication';
        if (cat.includes('social') || cat.includes('women')) return 'utility:groups';
        if (cat.includes('education') || cat.includes('skill') || cat.includes('capacity')) return 'utility:education';
        if (cat.includes('development') || cat.includes('infrastructure')) return 'utility:company';
        if (cat.includes('assistance') || cat.includes('disaster') || cat.includes('emergency')) return 'utility:world';
        if (cat.includes('livelihood')) return 'utility:trail';
        if (cat.includes('research')) return 'utility:search';
        return 'utility:form'; 
    }
}