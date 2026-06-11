import { LightningElement, track } from 'lwc';
import HERO from '@salesforce/resourceUrl/gmsHero1';
// Benefit Images
import BENEFIT_MAIN from '@salesforce/resourceUrl/benefitMain';
// Timeline Image
import TIMELINE from '@salesforce/resourceUrl/timelineCurve';
// Eligibility Images
import ACADEMIC from '@salesforce/resourceUrl/eligibleAcademic';
import NGO from '@salesforce/resourceUrl/eligibleNgo';
import STARTUP from '@salesforce/resourceUrl/eligibleStartup';
import RESEARCHER from '@salesforce/resourceUrl/eligibleResearcher';

export default class LandingPage extends LightningElement {

    heroImage = HERO;
    benefitMainImage = BENEFIT_MAIN;
    timelineImage = TIMELINE;
    
    // Eligibility images
    academicImage = ACADEMIC;
    ngoImage = NGO;
    startupImage = STARTUP;
    researcherImage = RESEARCHER;

    @track programs = [];
    @track selectedType = 'All';

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
                        amount: '₹' + item.Max_Amount__c
                    };
                });
            })
            .catch(error => {
                console.error('Error fetching programs:', error);
            });
    }

    handleFilterClick(event) {
        this.selectedType = event.target.dataset.type;
        this.fetchPrograms();
    }

    // Active tab classes
    get allClass() {
        return this.selectedType === 'All' ? 'active' : '';
    }

    get socialClass() {
        return this.selectedType === 'Social Welfare Program' ? 'active' : '';
    }

    get educationClass() {
        return this.selectedType === 'Education Program' ? 'active' : '';
    }

    get healthClass() {
        return this.selectedType === 'Healthcare Program' ? 'active' : '';
    }

    get communityClass() {
        return this.selectedType === 'Community Development' ? 'active' : '';
    }

    get livelihoodClass() {
        return this.selectedType === 'Livelihood Support' ? 'active' : '';
    }

    get emergencyClass() {
        return this.selectedType === 'Emergency Assistance' ? 'active' : '';
    }

    get researchClass() {
        return this.selectedType === 'Research Program' ? 'active' : '';
    }
}