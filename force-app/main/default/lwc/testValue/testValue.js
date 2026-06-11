import { LightningElement, wire, track } from 'lwc';
import getApplications from '@salesforce/apex/GrantApplicationController.getApplications';

export default class TestValue extends LightningElement {

    @track applications = [];
    @track error;

    pageSize = 5;
    currentPage = 1;
    totalPages = 0;

    @wire(getApplications)
    wiredApplications({ error, data }) {
        if (data) {
            this.applications = data;
            this.totalPages = Math.ceil(this.applications.length / this.pageSize);
        } else if (error) {
            this.error = error;
        }
    }

    // 👇 Get only records for current page
    get paginatedApplications() {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return this.applications.slice(start, end);
    }

    handleNext() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    handlePrevious() {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    get isFirstPage() {
        return this.currentPage === 1;
    }

    get isLastPage() {
        return this.currentPage === this.totalPages;
    }
}