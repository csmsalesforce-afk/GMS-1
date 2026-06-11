import { LightningElement, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getPrograms from '@salesforce/apex/GrantProgramController.getPrograms';

export default class GrantProgramAdmin extends NavigationMixin(LightningElement) {

    @track programs = [];
    @track searchKey = '';
    @track viewMode = 'table';
    @track showFilterMenu = false;

    connectedCallback() {
        console.log('GrantProgram component initialized');
    }

    /* -----------------------------
       Load Programs
    ----------------------------- */

    @wire(getPrograms)
    wiredPrograms({ error, data }) {

        if (data) {

            this.programs = data.map((program, index) => {
                return {
                    ...program,
                    slNo: index + 1,
                    formattedBudget: this.formatCurrency(program.totalBudget),
                    programType: program.programType || 'General',
                    statusClass: this.getStatusClass(program.status),
                    actionLabel: 'View Applications'
                };
            });

            console.log('Programs loaded:', this.programs.length);
        }

        if (error) {
            console.error('Error loading programs:', error);
        }
    }

    /* -----------------------------
       Search Filter
    ----------------------------- */

    get filteredPrograms() {

        if (!this.searchKey) {
            return this.programs;
        }

        const searchLower = this.searchKey.toLowerCase();

        return this.programs.filter(program =>
            program.programName.toLowerCase().includes(searchLower) ||
            (program.programType && program.programType.toLowerCase().includes(searchLower))
        );
    }

    /* -----------------------------
       UI Styles
    ----------------------------- */

    get filterButtonStyle() {
        return this.showFilterMenu
            ? 'background-color:#0070d2;border-radius:4px;padding:2px;'
            : '';
    }

    get tableButtonStyle() {
        return this.viewMode === 'table'
            ? 'background-color:#0070d2;border-radius:4px;padding:2px;'
            : '';
    }

    get gridButtonStyle() {
        return this.viewMode === 'grid'
            ? 'background-color:#0070d2;border-radius:4px;padding:2px;'
            : '';
    }

    /* -----------------------------
       Utility Functions
    ----------------------------- */

    formatCurrency(amount) {
        if (!amount) return '$0';
        return '$' + amount.toLocaleString('en-US');
    }

    getStatusClass(status) {

        const statusMap = {
            Open: 'status-badge status-open',
            Closed: 'status-badge status-closed',
            Draft: 'status-badge status-draft'
        };

        return statusMap[status] || 'status-badge';
    }

    /* -----------------------------
       Event Handlers
    ----------------------------- */

    handleSearch(event) {
        this.searchKey = event.target.value;
    }

    handleFilterClick() {
        this.showFilterMenu = !this.showFilterMenu;
    }

    handleTableView() {
        this.viewMode = 'table';
    }

    handleGridView() {
        this.viewMode = 'grid';
    }

    /* -----------------------------
       Create Program
    ----------------------------- */

    createProgram() {

        console.log('Create Program clicked');

        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'Program__c',
                actionName: 'new'
            }
        });
    }

    /* -----------------------------
       View Applications
    ----------------------------- */

    viewApplications(event) {

    const programId = event.currentTarget.dataset.id;

    console.log('Opening applications for program:', programId);

    const url = `/gmsa/s/grantapplications?programId=${programId}`;

    this[NavigationMixin.Navigate]({
        type: 'standard__webPage',
        attributes: {
            url: url
        }
    });
}

    /* -----------------------------
       More Actions
    ----------------------------- */

    handleMoreActions(event) {

        const programId = event.currentTarget.dataset.id;

        console.log('More actions clicked:', programId);
    }
}