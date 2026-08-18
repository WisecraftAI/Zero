function formatObservationsForBA(analysisResult) {
  const baObservations = {
    siteType: analysisResult.domainConfig?.name || 'Website',
    summary: `Analyzed ${analysisResult.siteOverview?.url || 'target URL'}. Found ${analysisResult.discoveredFeatures?.length || 0} features, ${analysisResult.discoveredForms?.length || 0} forms, ${analysisResult.userFlows?.length || 0} user flows.`,
    
    keyFeatures: analysisResult.discoveredFeatures?.map(f => ({
      name: f.name,
      priority: f.priority,
      description: f.description
    })) || [],
    
    criticalFlows: analysisResult.userFlows?.filter(f => f.priority === 'Critical').map(f => f.name) || [],
    
    formAnalysis: analysisResult.discoveredForms?.map(f => ({
      purpose: f.purpose,
      fieldCount: f.fieldCount,
      hasValidation: f.fields.some(field => field.required || field.pattern)
    })) || [],
    
    navigationStructure: {
      menuItems: analysisResult.discoveredElements?.NAVIGATION?.length || 0,
      pageHierarchy: analysisResult.pageStructure?.headings?.map(h => `H${h.level}: ${h.text}`).slice(0, 10) || []
    },
    
    testingRecommendations: [
      ...(analysisResult.antiBot ? ['Use headed browser mode due to anti-bot protection'] : []),
      ...(analysisResult.dynamicContent ? ['Use data-testid selectors for dynamic content'] : []),
      ...analysisResult.discoveredFeatures?.filter(f => f.priority === 'Critical').map(f => `Prioritize testing: ${f.name}`) || []
    ],
    
    warnings: analysisResult.warnings || [],
    
    suggestedRequirements: analysisResult.brd?.functionalRequirements?.slice(0, 10) || [],
    
    suggestedTestCases: analysisResult.generatedTestCases?.slice(0, 15) || []
  };

  return baObservations;
}

module.exports = { formatObservationsForBA };
