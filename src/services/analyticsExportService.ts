import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { 
  PerformanceMetrics, 
  BehavioralAnalysis,
  TeamBehaviorProfile,
  FacilitatorRecommendation 
} from './analyticsService';
import type { GameSession } from '../types/game';

// Export Types
export interface ExportOptions {
  format: 'pdf' | 'csv' | 'excel' | 'json';
  includeCharts: boolean;
  includeBehavioralAnalysis: boolean;
  includeRecommendations: boolean;
  teamFilter?: string[]; // Only include specific teams
  sections: ExportSection[];
}

export type ExportSection = 
  | 'summary'
  | 'team_performance' 
  | 'trading_analysis'
  | 'behavioral_insights'
  | 'recommendations'
  | 'timeline'
  | 'achievements'
  | 'raw_data';

export interface ExportData {
  sessionData: GameSession;
  performanceMetrics: PerformanceMetrics[];
  behavioralAnalysis: BehavioralAnalysis;
  generatedAt: number;
  facilitatorInfo?: {
    name: string;
    email: string;
    organization: string;
  };
}

export interface FacilitatorReport {
  executiveSummary: string;
  keyFindings: string[];
  teamHighlights: TeamHighlight[];
  actionItems: ActionItem[];
  followUpRecommendations: string[];
  dataVisualization: ChartConfig[];
}

export interface TeamHighlight {
  teamName: string;
  strengths: string[];
  developmentAreas: string[];
  notableAchievements: string[];
  recommendedActions: string[];
}

export interface ActionItem {
  priority: 'immediate' | 'short_term' | 'long_term';
  category: 'team_development' | 'process_improvement' | 'training' | 'culture';
  description: string;
  owner: string;
  timeline: string;
  successMetrics: string[];
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'radar' | 'pie' | 'scatter';
  title: string;
  data: any;
  options: any;
}

export class AnalyticsExportService {
  private static instance: AnalyticsExportService | null = null;

  static getInstance(): AnalyticsExportService {
    if (!AnalyticsExportService.instance) {
      AnalyticsExportService.instance = new AnalyticsExportService();
    }
    return AnalyticsExportService.instance;
  }

  /**
   * Export complete analytics report
   */
  async exportAnalyticsReport(
    data: ExportData, 
    options: ExportOptions,
    facilitatorInfo?: any
  ): Promise<void> {
    try {
      switch (options.format) {
        case 'pdf':
          await this.generatePDFReport(data, options, facilitatorInfo);
          break;
        case 'csv':
          await this.generateCSVExport(data, options);
          break;
        case 'excel':
          await this.generateExcelExport(data, options);
          break;
        case 'json':
          await this.generateJSONExport(data, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Failed to export analytics report:', error);
      throw error;
    }
  }

  /**
   * Generate facilitator debrief report
   */
  async generateFacilitatorReport(
    data: ExportData,
    customInsights?: string[]
  ): Promise<FacilitatorReport> {
    const report: FacilitatorReport = {
      executiveSummary: this.generateExecutiveSummary(data),
      keyFindings: this.extractKeyFindings(data),
      teamHighlights: this.generateTeamHighlights(data),
      actionItems: this.generateActionItems(data),
      followUpRecommendations: this.generateFollowUpRecommendations(data),
      dataVisualization: this.generateChartConfigs(data)
    };

    return report;
  }

  /**
   * Generate quick CSV for basic metrics
   */
  async exportQuickMetrics(performanceMetrics: PerformanceMetrics[]): Promise<void> {
    const csvData = performanceMetrics.map(team => ({
      'Team Name': team.teamName,
      'Colony Type': team.colonyType,
      'Final Score': team.finalScore,
      'Resource Score': team.componentScores.resourceScore,
      'Trading Score': team.componentScores.tradingScore,
      'Survival Score': team.componentScores.survivalScore,
      'Total Trades': team.tradingMetrics.totalTrades,
      'Avg Trade Value': team.tradingMetrics.avgTradeValue.toFixed(2),
      'Trading Efficiency': (team.tradingMetrics.tradingEfficiency * 100).toFixed(1) + '%',
      'Resource Utilization': (team.resourceMetrics.resourceUtilization * 100).toFixed(1) + '%',
      'Cooperation Index': (team.behavioralMetrics.cooperationIndex * 100).toFixed(1) + '%',
      'Adaptability Score': (team.behavioralMetrics.adaptabilityScore * 100).toFixed(1) + '%'
    }));

    const csv = this.convertToCSV(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `space-colony-metrics-${Date.now()}.csv`);
  }

  // Private methods

  private async generatePDFReport(
    data: ExportData, 
    options: ExportOptions,
    facilitatorInfo?: any
  ): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    let currentY = 20;
    const lineHeight = 7;
    const margin = 20;

    // Header
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Space Colony Exchange - Analytics Report', margin, currentY);
    currentY += 15;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Session: ${data.sessionData.name}`, margin, currentY);
    currentY += lineHeight;
    pdf.text(`Generated: ${new Date(data.generatedAt).toLocaleDateString()}`, margin, currentY);
    currentY += 15;

    // Executive Summary
    if (options.sections.includes('summary')) {
      currentY = this.addSectionHeader(pdf, 'Executive Summary', currentY, margin, pageWidth);
      
      const summary = this.generateExecutiveSummary(data);
      currentY = this.addWrappedText(pdf, summary, currentY, margin, pageWidth - 2 * margin, lineHeight);
      currentY += 10;
    }

    // Team Performance
    if (options.sections.includes('team_performance')) {
      currentY = this.addSectionHeader(pdf, 'Team Performance', currentY, margin, pageWidth);
      
      // Performance table
      const performanceData = data.performanceMetrics
        .filter(team => !options.teamFilter || options.teamFilter.includes(team.teamId))
        .sort((a, b) => b.finalScore - a.finalScore);

      const tableData = performanceData.map((team, index) => [
        (index + 1).toString(),
        team.teamName,
        team.colonyType,
        team.finalScore.toLocaleString(),
        team.tradingMetrics.totalTrades.toString(),
        (team.behavioralMetrics.cooperationIndex * 100).toFixed(0) + '%'
      ]);

      currentY = this.addTable(pdf, 
        ['Rank', 'Team', 'Type', 'Score', 'Trades', 'Cooperation'],
        tableData,
        currentY,
        margin,
        pageWidth - 2 * margin
      );
      currentY += 10;
    }

    // Behavioral Insights
    if (options.sections.includes('behavioral_insights') && options.includeBehavioralAnalysis) {
      currentY = this.addSectionHeader(pdf, 'Behavioral Insights', currentY, margin, pageWidth);
      
      data.behavioralAnalysis.teamBehaviors.forEach(behavior => {
        if (currentY > pageHeight - 40) {
          pdf.addPage();
          currentY = 20;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text(`${behavior.teamName} (${behavior.personalityType})`, margin, currentY);
        currentY += lineHeight;

        pdf.setFont('helvetica', 'normal');
        pdf.text(`Play Style: ${behavior.playStyle.replace(/_/g, ' ')}`, margin + 5, currentY);
        currentY += lineHeight;

        if (behavior.strengths.length > 0) {
          pdf.text('Strengths:', margin + 5, currentY);
          currentY += lineHeight;
          behavior.strengths.forEach(strength => {
            pdf.text(`• ${strength}`, margin + 10, currentY);
            currentY += lineHeight;
          });
        }

        currentY += 5;
      });
    }

    // Recommendations
    if (options.sections.includes('recommendations') && options.includeRecommendations) {
      currentY = this.addSectionHeader(pdf, 'Facilitator Recommendations', currentY, margin, pageWidth);
      
      const highPriorityRecs = data.behavioralAnalysis.recommendationsForFacilitator
        .filter(rec => rec.priority === 'high');

      highPriorityRecs.forEach(rec => {
        if (currentY > pageHeight - 30) {
          pdf.addPage();
          currentY = 20;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text(`${rec.title} (${rec.priority.toUpperCase()})`, margin, currentY);
        currentY += lineHeight;

        pdf.setFont('helvetica', 'normal');
        currentY = this.addWrappedText(pdf, rec.description, currentY, margin + 5, pageWidth - 2 * margin - 5, lineHeight);
        
        if (rec.actionItems.length > 0) {
          pdf.text('Action Items:', margin + 5, currentY);
          currentY += lineHeight;
          rec.actionItems.slice(0, 3).forEach(item => {
            pdf.text(`• ${item}`, margin + 10, currentY);
            currentY += lineHeight;
          });
        }

        currentY += 5;
      });
    }

    // Save PDF
    const filename = `space-colony-analytics-${data.sessionData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.pdf`;
    pdf.save(filename);
  }

  private async generateCSVExport(data: ExportData, options: ExportOptions): Promise<void> {
    const csvSections: string[] = [];

    // Team Performance CSV
    if (options.sections.includes('team_performance')) {
      const performanceData = data.performanceMetrics.map(team => ({
        'Team ID': team.teamId,
        'Team Name': team.teamName,
        'Colony Type': team.colonyType,
        'Final Score': team.finalScore,
        'Resource Score': team.componentScores.resourceScore,
        'Trading Score': team.componentScores.tradingScore,
        'Survival Score': team.componentScores.survivalScore,
        'Efficiency Score': team.componentScores.efficiencyScore,
        'Strategic Score': team.componentScores.strategicScore,
        'Total Trades': team.tradingMetrics.totalTrades,
        'Average Trade Value': team.tradingMetrics.avgTradeValue,
        'Trading Efficiency': team.tradingMetrics.tradingEfficiency,
        'Favorite Resource': team.tradingMetrics.favoriteResource,
        'Negotiation Success': team.tradingMetrics.negotiationSuccess,
        'Resource Utilization': team.resourceMetrics.resourceUtilization,
        'Waste Rate': team.resourceMetrics.wasteRate,
        'Critical Moments': team.resourceMetrics.criticalMoments,
        'Resource Diversity': team.resourceMetrics.resourceDiversity,
        'Decision Speed': team.behavioralMetrics.decisionSpeed,
        'Risk Tolerance': team.behavioralMetrics.riskTolerance,
        'Cooperation Index': team.behavioralMetrics.cooperationIndex,
        'Adaptability Score': team.behavioralMetrics.adaptabilityScore,
        'Communication Frequency': team.behavioralMetrics.communicationFrequency
      }));

      csvSections.push('TEAM PERFORMANCE METRICS');
      csvSections.push(this.convertToCSV(performanceData));
      csvSections.push('');
    }

    // Behavioral Analysis CSV
    if (options.sections.includes('behavioral_insights') && options.includeBehavioralAnalysis) {
      const behaviorData = data.behavioralAnalysis.teamBehaviors.map(behavior => ({
        'Team ID': behavior.teamId,
        'Team Name': behavior.teamName,
        'Personality Type': behavior.personalityType,
        'Play Style': behavior.playStyle,
        'Strengths': behavior.strengths.join('; '),
        'Development Areas': behavior.developmentAreas.join('; '),
        'Emergent Leader': behavior.leadership.emergentLeader,
        'Leadership Style': behavior.leadership.leadershipStyle,
        'Influence Radius': behavior.leadership.influenceRadius,
        'Collaboration Frequency': behavior.collaboration.collaborationFrequency,
        'Trust Level': behavior.collaboration.trustLevel,
        'Mutual Benefit': behavior.collaboration.mutualBenefit,
        'Helpfulness': behavior.collaboration.helpfulness
      }));

      csvSections.push('BEHAVIORAL ANALYSIS');
      csvSections.push(this.convertToCSV(behaviorData));
      csvSections.push('');
    }

    // Trading Analysis CSV
    if (options.sections.includes('trading_analysis')) {
      // This would include detailed trade data
      csvSections.push('TRADING SUMMARY');
      csvSections.push('Total Trades,Average Value,Most Active Round');
      csvSections.push(`${data.performanceMetrics.reduce((sum, team) => sum + team.tradingMetrics.totalTrades, 0)},${(data.performanceMetrics.reduce((sum, team) => sum + team.tradingMetrics.avgTradeValue, 0) / data.performanceMetrics.length).toFixed(2)},Round 3`);
      csvSections.push('');
    }

    const finalCSV = csvSections.join('\n');
    const blob = new Blob([finalCSV], { type: 'text/csv;charset=utf-8;' });
    const filename = `space-colony-analytics-${data.sessionData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.csv`;
    saveAs(blob, filename);
  }

  private async generateExcelExport(data: ExportData, options: ExportOptions): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Team Performance Sheet
    if (options.sections.includes('team_performance')) {
      const performanceData = data.performanceMetrics.map(team => ({
        'Team Name': team.teamName,
        'Colony Type': team.colonyType,
        'Final Score': team.finalScore,
        'Resource Score': team.componentScores.resourceScore,
        'Trading Score': team.componentScores.tradingScore,
        'Total Trades': team.tradingMetrics.totalTrades,
        'Avg Trade Value': team.tradingMetrics.avgTradeValue,
        'Resource Utilization': team.resourceMetrics.resourceUtilization,
        'Cooperation Index': team.behavioralMetrics.cooperationIndex
      }));

      const worksheet = XLSX.utils.json_to_sheet(performanceData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Team Performance');
    }

    // Behavioral Analysis Sheet
    if (options.sections.includes('behavioral_insights') && options.includeBehavioralAnalysis) {
      const behaviorData = data.behavioralAnalysis.teamBehaviors.map(behavior => ({
        'Team Name': behavior.teamName,
        'Personality Type': behavior.personalityType,
        'Play Style': behavior.playStyle,
        'Strengths': behavior.strengths.join(', '),
        'Development Areas': behavior.developmentAreas.join(', ')
      }));

      const behaviorSheet = XLSX.utils.json_to_sheet(behaviorData);
      XLSX.utils.book_append_sheet(workbook, behaviorSheet, 'Behavioral Analysis');
    }

    // Recommendations Sheet
    if (options.sections.includes('recommendations') && options.includeRecommendations) {
      const recommendationsData = data.behavioralAnalysis.recommendationsForFacilitator.map(rec => ({
        'Category': rec.category,
        'Priority': rec.priority,
        'Title': rec.title,
        'Description': rec.description,
        'Action Items': rec.actionItems.join('; ')
      }));

      const recSheet = XLSX.utils.json_to_sheet(recommendationsData);
      XLSX.utils.book_append_sheet(workbook, recSheet, 'Recommendations');
    }

    // Save Excel file
    const filename = `space-colony-analytics-${data.sessionData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }

  private async generateJSONExport(data: ExportData, options: ExportOptions): Promise<void> {
    const exportData: any = {
      metadata: {
        sessionName: data.sessionData.name,
        exportedAt: new Date().toISOString(),
        format: 'json',
        sections: options.sections
      }
    };

    if (options.sections.includes('team_performance')) {
      exportData.teamPerformance = data.performanceMetrics;
    }

    if (options.sections.includes('behavioral_insights') && options.includeBehavioralAnalysis) {
      exportData.behavioralAnalysis = data.behavioralAnalysis;
    }

    if (options.sections.includes('raw_data')) {
      exportData.sessionData = data.sessionData;
    }

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = `space-colony-analytics-${data.sessionData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.json`;
    saveAs(blob, filename);
  }

  // Helper methods for PDF generation

  private addSectionHeader(pdf: jsPDF, title: string, y: number, margin: number, pageWidth: number): number {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, y);
    
    // Add underline
    const textWidth = pdf.getTextWidth(title);
    pdf.line(margin, y + 2, margin + textWidth, y + 2);
    
    return y + 12;
  }

  private addWrappedText(pdf: jsPDF, text: string, y: number, x: number, maxWidth: number, lineHeight: number): number {
    const lines = pdf.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string) => {
      pdf.text(line, x, y);
      y += lineHeight;
    });
    
    return y + 3;
  }

  private addTable(pdf: jsPDF, headers: string[], data: string[][], y: number, x: number, tableWidth: number): number {
    const colWidth = tableWidth / headers.length;
    const rowHeight = 8;
    
    // Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    headers.forEach((header, i) => {
      pdf.text(header, x + i * colWidth, y);
    });
    
    y += rowHeight;
    pdf.line(x, y - 2, x + tableWidth, y - 2);
    
    // Data rows
    pdf.setFont('helvetica', 'normal');
    data.forEach(row => {
      row.forEach((cell, i) => {
        pdf.text(cell, x + i * colWidth, y);
      });
      y += rowHeight;
    });
    
    return y + 5;
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  private generateExecutiveSummary(data: ExportData): string {
    const topTeam = data.performanceMetrics.sort((a, b) => b.finalScore - a.finalScore)[0];
    const totalTrades = data.performanceMetrics.reduce((sum, team) => sum + team.tradingMetrics.totalTrades, 0);
    const avgCooperation = data.performanceMetrics.reduce((sum, team) => sum + team.behavioralMetrics.cooperationIndex, 0) / data.performanceMetrics.length;

    return `The ${data.sessionData.name} session concluded with ${data.performanceMetrics.length} teams participating across ${data.sessionData.currentRound} rounds. ${topTeam.teamName} (${topTeam.colonyType}) emerged as the top performer with a final score of ${topTeam.finalScore.toLocaleString()} points. The session generated ${totalTrades} total trades, demonstrating an active trading economy. Teams showed an average cooperation index of ${(avgCooperation * 100).toFixed(0)}%, indicating effective collaboration throughout the game.`;
  }

  private extractKeyFindings(data: ExportData): string[] {
    return [
      `${data.performanceMetrics[0].teamName} demonstrated superior strategic planning`,
      `Trading activity peaked in Round 3 with alien contact event`,
      `${Math.round(data.performanceMetrics.filter(team => team.behavioralMetrics.cooperationIndex > 0.7).length / data.performanceMetrics.length * 100)}% of teams showed high cooperation`,
      `Resource efficiency varied significantly across colony types`
    ];
  }

  private generateTeamHighlights(data: ExportData): TeamHighlight[] {
    return data.performanceMetrics.slice(0, 3).map(team => ({
      teamName: team.teamName,
      strengths: ['Strategic planning', 'Resource management'],
      developmentAreas: ['Communication', 'Risk assessment'],
      notableAchievements: team.achievements.map(a => a.title),
      recommendedActions: ['Focus on collaborative decision making', 'Develop contingency planning skills']
    }));
  }

  private generateActionItems(data: ExportData): ActionItem[] {
    return data.behavioralAnalysis.recommendationsForFacilitator.slice(0, 5).map(rec => ({
      priority: rec.priority as any,
      category: rec.category as any,
      description: rec.description,
      owner: 'Team Lead',
      timeline: rec.priority === 'high' ? '1-2 weeks' : '1 month',
      successMetrics: ['Improved team collaboration', 'Better resource efficiency']
    }));
  }

  private generateFollowUpRecommendations(data: ExportData): string[] {
    return [
      'Schedule team debrief sessions within 1 week',
      'Implement identified process improvements',
      'Plan follow-up team building activities',
      'Develop individual development plans based on behavioral insights'
    ];
  }

  private generateChartConfigs(data: ExportData): ChartConfig[] {
    return [
      {
        type: 'bar',
        title: 'Team Performance Comparison',
        data: {
          labels: data.performanceMetrics.map(team => team.teamName),
          datasets: [{
            label: 'Final Score',
            data: data.performanceMetrics.map(team => team.finalScore)
          }]
        },
        options: {}
      }
    ];
  }
}