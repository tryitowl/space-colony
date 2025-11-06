import type { IntelTemplate, IntelTemplateConfig } from '../types/intel.types';
import defaultTemplates from '../config/intelTemplates.json';

export class IntelTemplateLoader {
  private static instance: IntelTemplateLoader;
  private templates: IntelTemplateConfig;
  private customTemplates: IntelTemplateConfig | null = null;

  private constructor() {
    // Load default templates
    this.templates = defaultTemplates as IntelTemplateConfig;
  }

  static getInstance(): IntelTemplateLoader {
    if (!IntelTemplateLoader.instance) {
      IntelTemplateLoader.instance = new IntelTemplateLoader();
    }
    return IntelTemplateLoader.instance;
  }

  /**
   * Load custom templates (for facilitator customization)
   */
  loadCustomTemplates(customConfig: IntelTemplateConfig): void {
    this.validateTemplateConfig(customConfig);
    this.customTemplates = customConfig;
  }

  /**
   * Get templates for a specific round
   */
  getTemplatesForRound(round: number): IntelTemplate[] {
    const roundKey = round.toString();
    
    // Check custom templates first
    if (this.customTemplates?.templates[roundKey]) {
      return this.customTemplates.templates[roundKey];
    }
    
    // Fall back to default templates
    return this.templates.templates[roundKey] || [];
  }

  /**
   * Get all available placeholders
   */
  getPlaceholders(): Record<string, string[]> {
    // Merge custom and default placeholders
    if (this.customTemplates?.placeholders) {
      return {
        ...this.templates.placeholders,
        ...this.customTemplates.placeholders
      };
    }
    
    return this.templates.placeholders;
  }

  /**
   * Add a new template at runtime
   */
  addTemplate(round: number, template: IntelTemplate): void {
    if (!this.customTemplates) {
      this.customTemplates = {
        templates: {},
        placeholders: {}
      };
    }
    
    const roundKey = round.toString();
    if (!this.customTemplates.templates[roundKey]) {
      this.customTemplates.templates[roundKey] = [];
    }
    
    this.customTemplates.templates[roundKey].push(template);
  }

  /**
   * Replace a placeholder value in template content
   */
  replacePlaceholder(content: string, placeholder: string, value: string): string {
    const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
    return content.replace(regex, value);
  }

  /**
   * Get a random value for a placeholder
   */
  getRandomPlaceholderValue(placeholder: string): string {
    const values = this.getPlaceholders()[placeholder];
    if (!values || values.length === 0) {
      return `{${placeholder}}`; // Return unchanged if no values found
    }
    
    return values[Math.floor(Math.random() * values.length)];
  }

  /**
   * Validate template configuration
   */
  private validateTemplateConfig(config: IntelTemplateConfig): void {
    if (!config.templates || typeof config.templates !== 'object') {
      throw new Error('Invalid template configuration: missing templates object');
    }
    
    // Validate each round's templates
    Object.entries(config.templates).forEach(([round, templates]) => {
      if (!Array.isArray(templates)) {
        throw new Error(`Invalid templates for round ${round}: must be an array`);
      }
      
      templates.forEach((template, index) => {
        this.validateTemplate(template, `Round ${round}, Template ${index}`);
      });
    });
  }

  /**
   * Validate individual template
   */
  private validateTemplate(template: IntelTemplate, context: string): void {
    const requiredFields = ['type', 'title', 'content', 'baseValue', 'applicableRounds', 'exclusivity'];
    
    requiredFields.forEach(field => {
      if (!(field in template)) {
        throw new Error(`${context}: Missing required field "${field}"`);
      }
    });
    
    if (!Array.isArray(template.applicableRounds)) {
      throw new Error(`${context}: applicableRounds must be an array`);
    }
    
    if (template.minScoutLevel !== undefined && template.minScoutLevel < 0) {
      throw new Error(`${context}: minScoutLevel must be non-negative`);
    }
  }

  /**
   * Export current configuration (including custom templates)
   */
  exportConfiguration(): IntelTemplateConfig {
    if (this.customTemplates) {
      return {
        templates: {
          ...this.templates.templates,
          ...this.customTemplates.templates
        },
        placeholders: {
          ...this.templates.placeholders,
          ...this.customTemplates.placeholders
        }
      };
    }
    
    return this.templates;
  }

  /**
   * Reset to default templates only
   */
  resetToDefaults(): void {
    this.customTemplates = null;
  }
}