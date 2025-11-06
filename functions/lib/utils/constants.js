"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRADE_LIMITS = exports.MAX_TRADE_REQUEST_VALUES = exports.CRITICAL_RESOURCE_THRESHOLDS = exports.RESOURCE_VALUES = void 0;
exports.RESOURCE_VALUES = {
    // Basic resources (per unit)
    oxygen: 5,
    food: 3,
    water: 2,
    energy: 4,
    // Advanced resources
    minerals: 8,
    alloys: 15,
    tech_components: 20,
    medical_supplies: 12,
    fuel: 10,
    // Rare resources
    quantum_crystals: 50,
    alien_tech: 100,
    hyperfuel: 75
};
exports.CRITICAL_RESOURCE_THRESHOLDS = {
    oxygen: 5,
    food: 5,
    water: 3,
    energy: 6
};
exports.MAX_TRADE_REQUEST_VALUES = {
    // Basic resources
    oxygen: 20,
    food: 20,
    water: 20,
    energy: 20,
    // Advanced resources
    minerals: 15,
    alloys: 10,
    tech_components: 8,
    medical_supplies: 10,
    fuel: 15,
    // Rare resources
    quantum_crystals: 3,
    alien_tech: 2,
    hyperfuel: 4
};
exports.TRADE_LIMITS = {
    maxOfferedResources: 5,
    maxRequestedResources: 5,
    maxOfferedIntel: 3,
    maxRequestedIntel: 3,
    minTradeValue: 10,
    maxTradeValue: 500
};
//# sourceMappingURL=constants.js.map