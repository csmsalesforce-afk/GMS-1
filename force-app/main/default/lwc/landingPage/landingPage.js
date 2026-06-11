import { LightningElement, track } from 'lwc';
// Import your main Hero image from Static Resources
import HERO from '@salesforce/resourceUrl/gmsHero1';
// Benefit Images
import BENEFIT_MAIN from '@salesforce/resourceUrl/benefitMain';
import { NavigationMixin } from 'lightning/navigation';

// Timeline Image
import TIMELINE from '@salesforce/resourceUrl/timelineCurve';
// Eligibility Images
import ACADEMIC from '@salesforce/resourceUrl/eligibleAcademic';
import NGO from '@salesforce/resourceUrl/eligibleNgo';
import STARTUP from '@salesforce/resourceUrl/eligibleStartup';
import RESEARCHER from '@salesforce/resourceUrl/eligibleResearcher';
export default class LandingPage extends NavigationMixin(LightningElement) {

    heroImage = HERO;

 benefitMainImage = BENEFIT_MAIN;
      // Eligibility images
    academicImage = ACADEMIC;
    ngoImage = NGO;
    startupImage = STARTUP;
    researcherImage = RESEARCHER;
  timelineImage = TIMELINE;

    @track programs = [];
    @track selectedType = 'All';


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

    // 3. ADD THE NAVIGATION METHOD
 handleViewAllClick() {
    console.log("clicked")
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'allProgramList__c' // Matches the API Name from your screenshot
            }
        });
    }

    connectedCallback() {
        this.fetchPrograms();
    }

    scrollToPrograms() {
        const section = this.template.querySelector('[data-section="programs"]');
        if (section) {
            const offset = 80;
            const top = section.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({
                top: top,
                behavior: 'smooth'
            });
        }
    }

    fetchPrograms() {
        let url = '/gmsa/services/apexrest/programs';

        if (this.selectedType && this.selectedType !== 'All') {
            url += '?type=' + encodeURIComponent(this.selectedType);
        }

       fetch(url)
            .then(response => response.json())
            .then(data => {
                this.programs = data.map(item => {
                    return {
                        id: item.Id,
                        title: item.Name,
                        category: item.Program_Type__c,
                        // Call the new formatting method here!
                        amount: this.formatCurrency(item.Max_Amount__c), 
                        icon: this.getIconByCategory(item.Program_Type__c) 
                    };
                });
            })
            .catch(error => {
                console.error('Error fetching programs:', error);
            });
    }

    // Assigns SLDS utility icons based on the program category name
    getIconByCategory(category) {
        if (!category) return 'utility:apps';
        
        const cat = category.toLowerCase();
        if (cat.includes('health')) return 'standard:medication';
        if (cat.includes('social') || cat.includes('women')) return 'utility:groups';
        if (cat.includes('education') || cat.includes('skill') || cat.includes('literacy')) return 'utility:education';
        if (cat.includes('development') || cat.includes('infrastructure')) return 'utility:company';
        if (cat.includes('assistance') || cat.includes('disaster') || cat.includes('emergency')) return 'utility:world';
        if (cat.includes('livelihood')) return 'utility:trail';
        if (cat.includes('research')) return 'utility:search';
        
        return 'utility:form'; // Default fallback icon
    }

    handleFilterClick(event) {
        this.selectedType = event.target.dataset.type;
        this.fetchPrograms();
    }

    // ===== ACTIVE TAB CLASSES =====
    get allClass() { return this.selectedType === 'All' ? 'active' : ''; }
    get socialClass() { return this.selectedType === 'Social Welfare Program' ? 'active' : ''; }
    get educationClass() { return this.selectedType === 'Education Program' ? 'active' : ''; }
    get healthClass() { return this.selectedType === 'Healthcare Program' ? 'active' : ''; }
    get communityClass() { return this.selectedType === 'Community Development' ? 'active' : ''; }
    get livelihoodClass() { return this.selectedType === 'Livelihood Support' ? 'active' : ''; }
    get emergencyClass() { return this.selectedType === 'Emergency Assistance' ? 'active' : ''; }
    get researchClass() { return this.selectedType === 'Research Program' ? 'active' : ''; }
}