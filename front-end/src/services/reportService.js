/**
 * Reports Service
 * API calls for AI-generated reports using Gemini API
 */
import api from '../api/api';

/**
 * Generate AI-powered report
 * @param {Object} request - Report request parameters
 * @param {string} request.report_type - Type of report (overall_summary, volunteer_insights, study_performance, custom)
 * @param {Object} request.date_range - Optional date range {start, end}
 * @param {string} request.custom_prompt - Custom question for AI (required for custom reports)
 * @returns {Promise<Object>} Report response with summary and raw data
 */
export const generateReport = async (request) => {
    try {
        const response = await api.post('/reports/generate', request);
        console.log('📊 Report generated:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error generating report:', error);
        throw error;
    }
};

/**
 * Get raw metrics data without AI analysis
 * @returns {Promise<Object>} Raw metrics data
 */
export const getReportMetrics = async () => {
    try {
        const response = await api.get('/reports/metrics');
        console.log('📈 Metrics fetched:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching metrics:', error);
        throw error;
    }
};

/**
 * Check Gemini API health status
 * @returns {Promise<Object>} API health status
 */
export const checkAPIHealth = async () => {
    try {
        const response = await api.get('/reports/health');
        return response.data;
    } catch (error) {
        console.error('Error checking API health:', error);
        throw error;
    }
};

/**
 * Export report as PDF (client-side generation)
 * @param {Object} reportData - Report data to export
 * @param {string} reportType - Type of report
 */
export const exportReportPDF = async (reportData, reportType) => {
    // Create a printable HTML version
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${reportType} Report - ${new Date().toLocaleDateString()}</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    max-width: 800px;
                    margin: 40px auto;
                    padding: 20px;
                    line-height: 1.6;
                    color: #333;
                }
                h1 {
                    color: #6366f1;
                    border-bottom: 3px solid #6366f1;
                    padding-bottom: 10px;
                    margin-bottom: 30px;
                }
                h2 {
                    color: #4f46e5;
                    margin-top: 30px;
                }
                .meta {
                    color: #666;
                    font-size: 14px;
                    margin-bottom: 30px;
                }
                .summary {
                    white-space: pre-wrap;
                    background: #f9fafb;
                    padding: 20px;
                    border-left: 4px solid #6366f1;
                    margin: 20px 0;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 20px;
                    }
                }
            </style>
        </head>
        <body>
            <h1>Mascot Tech - ${reportType.replace(/_/g, ' ').toUpperCase()}</h1>
            <div class="meta">
                Generated on: ${new Date(reportData.generated_at).toLocaleString()}<br>
                Report Type: ${reportType}
            </div>
            <h2>AI-Generated Summary</h2>
            <div class="summary">${reportData.summary}</div>
            <h2>Data Overview</h2>
            <pre>${JSON.stringify(reportData.raw_data, null, 2)}</pre>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    // Trigger print dialog after content loads
    printWindow.onload = () => {
        printWindow.print();
    };
};

export default {
    generateReport,
    getReportMetrics,
    checkAPIHealth,
    exportReportPDF
};
