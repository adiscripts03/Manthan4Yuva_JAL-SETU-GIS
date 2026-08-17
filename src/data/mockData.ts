export const reportsData = [
  {
    id: "W14-WL-2023-Q3",
    ward: "Dharampeth (Ward 14)",
    dateRange: "Jun 01 - Sep 30, 2023",
    dateGenerated: "24 OCT 2024",
    historicalEvents: 14,
    eventsDelta: 3,
    maxDepth: "0.8m",
    maxDepthLocation: "Shankar Nagar Sq",
    summary: "AI analysis indicates a 24% increase in severe waterlogging events compared to the 5-year median for Ward 14. The primary failure point correlates with anomalous precipitation spikes exceeding 45mm/hr overwhelming the primary trunk line along West High Court Road.",
    recommendations: [
      {
        id: "01",
        title: "Desilting Intervention",
        description: "Immediate clearing required for 1.2km stretch of secondary drainage parallel to VIP Road. Current capacity at 42%."
      },
      {
        id: "02",
        title: "Pump Station Upgrade",
        description: "Deploy auxiliary mobile pump units (min 500 LPS) at Zone 3 depression point prior to next forecasted heavy rainfall event."
      }
    ]
  }
];

export const civicLedgerData = [
  {
    id: "NGP-2024-88A",
    title: "Dharampeth Main Drain Desilting",
    status: "COMPLETED",
    description: "Emergency desilting protocol initiated following critical blockage detection by sensor grid C-4. Approximately 250 cubic meters of debris physically verified and removed.",
    location: "21.1458° N, 79.0882° E",
    assignedTo: "Zone 4 Rapid Response",
    hash: "0x8f7c90123ea3b9e2a1d4f5c6e7d8a9b0c1d2e3f4a5b6c7d8e9f",
    network: "Polygon Mainnet",
    contract: "CivicRegistry_v2",
    timeline: [
      {
        title: "Hotspot Identified",
        time: "2024-05-12 08:14",
        description: "Automated sensor grid detached abnormal flow reduction.",
        verified: true
      },
      {
        title: "Intervention Recommended",
        time: "2024-05-12 09:30",
        description: "AI hydraulic model recommended immediate desilting.",
        verified: true
      },
      {
        title: "Maintenance Assigned",
        time: "2024-05-12 11:05",
        description: "Work order dispatched to Zone 4 Rapid Response team via dispatch system.",
        verified: true
      },
      {
        title: "Completed & Verified",
        time: "2024-05-13 16:45",
        description: "Field team submitted photographic proof. Sensor arrays dynamically confirmed normal flow volume restored to 95% capacity.",
        verified: true,
        final: true
      }
    ]
  }
];

export const rainfallData = [
  {
    stationId: "STN-01",
    name: "Civil Lines Main",
    currentPrecipitation: 12.5,
    status: "Normal",
    forecast: "Light Rain"
  },
  {
    stationId: "STN-02",
    name: "Airport Station",
    currentPrecipitation: 45.2,
    status: "High",
    forecast: "Heavy Rain"
  }
];

export const telemetryData = {
  currentRate: 42.5,
  cumulative24h: 128.2,
  peakGust: 65,
  correlations: [
    {
      id: "Sitabuldi",
      name: "Sitabuldi Interchange",
      overlap: 92,
      description: "High intensity rainfall matches localized depression model.",
      level: "high"
    },
    {
      id: "Dharampeth",
      name: "Dharampeth Zone",
      overlap: 68,
      description: "Moderate pooling detected at secondary drainage nodes.",
      level: "medium"
    },
    {
      id: "Wardha",
      name: "Wardha Road",
      overlap: 24,
      description: "Normal flow expected; minor pooling in potholes.",
      level: "low"
    }
  ]
};

export const mappingData = {
   wards: ["Dharampeth (Ward 14)", "Laxmi Nagar (Ward 12)", "Mahal (Ward 8)", "Sitabuldi (Ward 15)"]
};

export const networkAssetsData = [
  {
    assetId: "DRAIN D-042",
    type: "Secondary",
    zone: "SITABULDI ZONE",
    dimension: "1.2 km",
    capacity: "450 MLD",
    conditionLabel: "POOR (82% Silt)",
    conditionSeverity: "error",
    hierarchy: [
      { id: "DRAIN D-042", name: "DRAIN D-042", active: true, type: "Secondary" },
      { id: "Trunk P-12", name: "Main Trunk P-12", active: false, type: "Primary" },
      { id: "Nag Nadi", name: "Nag Nadi", active: false, type: "Nala" }
    ]
  },
  {
    assetId: "PUMP P-12",
    type: "Pump Station",
    zone: "LAKKADGANJ ZONE",
    dimension: "120 kW",
    capacity: "850 MLD",
    conditionLabel: "GOOD (Online)",
    conditionSeverity: "primary",
    hierarchy: [
      { id: "PUMP P-12", name: "PUMP P-12", active: true, type: "Pump Station" },
      { id: "Trunk N-08", name: "Main Trunk N-08", active: false, type: "Primary" }
    ]
  }
];

export const topographyData = [
  {
    area: "Sitabuldi Basin (Ward 15)",
    metrics: {
      totalPopulation: "145,200",
      density: "12k /km²",
      avgElevation: "310m MSL",
      atRisk: {
        count: "34,800",
        percentage: "24%"
      }
    },
    elevationZones: [
      { label: "High (>320m)", count: "42,000", percentage: 29, color: "tertiary" },
      { label: "Mid (300-320m)", count: "68,400", percentage: 47, color: "primary" },
      { label: "Low (<300m)", count: "34,800", percentage: 24, color: "error" }
    ]
  },
  {
    area: "Dharampeth (Ward 14)",
    metrics: {
      totalPopulation: "112,000",
      density: "9k /km²",
      avgElevation: "315m MSL",
      atRisk: {
        count: "15,000",
        percentage: "13%"
      }
    },
    elevationZones: [
      { label: "High (>320m)", count: "60,000", percentage: 53, color: "tertiary" },
      { label: "Mid (300-320m)", count: "37,000", percentage: 34, color: "primary" },
      { label: "Low (<300m)", count: "15,000", percentage: 13, color: "error" }
    ]
  }
];
