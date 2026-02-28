#!/usr/bin/env node

/**
 * Generate JMeter Test Plan Files Programmatically
 * Creates XML-based JMeter test plans for different load testing scenarios
 */

const fs = require('fs');
const path = require('path');

// Test plan configurations
const testConfigs = {
  smoke: {
    name: 'Smoke Test',
    threads: 10,
    rampUp: 60,
    duration: 300,
    description: 'Quick sanity check'
  },
  'ramp-up': {
    name: 'Ramp-up Test',
    threads: 250,
    rampUp: 300,
    duration: 900,
    description: 'Gradually increase load to identify breaking point'
  },
  sustained: {
    name: 'Sustained Load Test',
    threads: 300,
    rampUp: 120,
    duration: 600,
    description: 'Test system stability under constant heavy load'
  },
  spike: {
    name: 'Spike Test',
    threads: 400,
    rampUp: 10,
    duration: 1200,
    description: 'Simulate sudden traffic surge'
  },
  stress: {
    name: 'Stress Test',
    threads: 500,
    rampUp: 600,
    duration: 1800,
    description: 'Push system to breaking point'
  }
};

// API endpoints to test
const endpoints = [
  { method: 'GET', path: '/api/products', name: 'Get Products', weight: 30 },
  { method: 'GET', path: '/api/products/1', name: 'Get Product Detail', weight: 20 },
  { method: 'POST', path: '/api/cart', name: 'Add to Cart', weight: 15 },
  { method: 'GET', path: '/api/cart', name: 'Get Cart', weight: 15 },
  { method: 'POST', path: '/api/orders', name: 'Create Order', weight: 10 },
  { method: 'GET', path: '/api/orders', name: 'Get Orders', weight: 10 }
];

/**
 * Generate a JMeter test plan XML
 */
function generateTestPlan(testType, config) {
  const threadGroupName = `${config.name} - Thread Group`;

  // Generate HTTP sampler elements
  let httpSamplers = '';
  endpoints.forEach((endpoint, index) => {
    const isPost = endpoint.method === 'POST';
    httpSamplers += generateHttpSampler(endpoint, index);
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="Test Plan" enabled="true">
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
        <collectionProp name="Arguments.arguments"/>
      </elementProp>
      <stringProp name="TestPlan.user_define_classpath"></stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
      <elementProp name="TestPlan.test_file_elements" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="Test File Elements" enabled="true">
        <collectionProp name="Arguments.arguments"/>
      </elementProp>
      <stringProp name="TestPlan.comments">${config.description}</stringProp>
      <boolProp name="TestPlan.tearDown_on_shutdown">true</boolProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="${threadGroupName}" enabled="true">
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" testname="Loop Controller" enabled="true">
          <boolProp name="LoopController.continue_forever">false</boolProp>
          <stringProp name="LoopController.loops">1</stringProp>
        </elementProp>
        <stringProp name="ThreadGroup.num_threads">${config.threads}</stringProp>
        <stringProp name="ThreadGroup.ramp_time">${config.rampUp}</stringProp>
        <elementProp name="ThreadGroup.duration_assertion" elementType="DurationAssertion" guiclass="DurationAssertionGui" testclass="DurationAssertion" testname="Duration Time" enabled="true">
          <stringProp name="DurationAssertion.milliseconds">${config.duration * 1000}</stringProp>
        </elementProp>
        <stringProp name="ThreadGroup.delay_startup">0</stringProp>
        <stringProp name="ThreadGroup.duration">${config.duration}</stringProp>
        <stringProp name="ThreadGroup.scheduler">true</stringProp>
        <boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>
      </ThreadGroup>
      <hashTree>
        <ConfigTestElement guiclass="HttpDefaultsGui" testclass="ConfigTestElement" testname="HTTP Request Defaults" enabled="true">
          <elementProp name="Arguments" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
            <collectionProp name="Arguments.arguments">
              <elementProp name="timeout" elementType="Argument">
                <stringProp name="Argument.name">timeout</stringProp>
                <stringProp name="Argument.value">10000</stringProp>
              </elementProp>
            </collectionProp>
          </elementProp>
          <stringProp name="HTTPSampler.domain">localhost</stringProp>
          <stringProp name="HTTPSampler.port">3000</stringProp>
          <stringProp name="HTTPSampler.protocol">http</stringProp>
          <stringProp name="HTTPSampler.contentEncoding"></stringProp>
          <stringProp name="HTTPSampler.path"></stringProp>
          <stringProp name="HTTPSampler.concurrentPool">4</stringProp>
        </ConfigTestElement>
        <hashTree/>
        ${generateSimpleController(endpoints)}
        <hashTree>
          ${httpSamplers}
          <hashTree>
            <ResultCollector guiclass="SummaryReport" testclass="ResultCollector" testname="Summary Report" enabled="true">
              <elementProp name="Arguments" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
                <collectionProp name="Arguments.arguments"/>
              </elementProp>
              <stringProp name="filename"></stringProp>
              <boolProp name="ResultCollector.error_logging">false</boolProp>
              <boolProp name="ResultCollector.success_only">false</boolProp>
              <boolProp name="ResultCollector.properties">false</boolProp>
              <boolProp name="ResultCollector.child_nodes">false</boolProp>
              <stringProp name="ResultCollector.label"></stringProp>
              <stringProp name="ResultCollector.filename_variable"></stringProp>
            </ResultCollector>
            <hashTree/>
            <Summariser guiclass="SummaryReport" testclass="Summariser" testname="Generate Summary Results" enabled="true"/>
            <hashTree/>
          </hashTree>
        </hashTree>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>`;

  return xml;
}

/**
 * Generate a Simple Controller for grouping requests
 */
function generateSimpleController(endpoints) {
  return `<GenericController guiclass="LogicControllerGui" testclass="GenericController" testname="API Requests" enabled="true"/>`;
}

/**
 * Generate an HTTP Sampler for an endpoint
 */
function generateHttpSampler(endpoint, index) {
  const method = endpoint.method;
  const isPost = method === 'POST';

  const bodyData = isPost ? `<elementProp name="Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
            <collectionProp name="Arguments.arguments">
              <elementProp name="quantity" elementType="HTTPArgument">
                <boolProp name="HTTPArgument.always_encode">true</boolProp>
                <stringProp name="Argument.name">quantity</stringProp>
                <stringProp name="Argument.value">1</stringProp>
                <stringProp name="Argument.metadata">=</stringProp>
                <boolProp name="HTTPArgument.use_equals">true</boolProp>
              </elementProp>
            </collectionProp>
          </elementProp>` : '';

  return `<HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="${endpoint.name}" enabled="true">
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
            <collectionProp name="Arguments.arguments"/>
          </elementProp>
          <stringProp name="HTTPSampler.domain">localhost</stringProp>
          <stringProp name="HTTPSampler.port">3000</stringProp>
          <stringProp name="HTTPSampler.protocol">http</stringProp>
          <stringProp name="HTTPSampler.contentEncoding"></stringProp>
          <stringProp name="HTTPSampler.path">${endpoint.path}</stringProp>
          <stringProp name="HTTPSampler.method">${method}</stringProp>
          <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
          <boolProp name="HTTPSampler.auto_redirects">false</boolProp>
          <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
          <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>
          <stringProp name="HTTPSampler.embedded_url_re"></stringProp>
          <stringProp name="HTTPSampler.connect_timeout">10000</stringProp>
          <stringProp name="HTTPSampler.response_timeout">10000</stringProp>
        </HTTPSamplerProxy>`;
}

/**
 * Save test plan to file
 */
function saveTestPlan(testType, xml) {
  const testPlansDir = path.join(__dirname, '..', 'jmeter', 'test-plans');

  // Create directory if it doesn't exist
  if (!fs.existsSync(testPlansDir)) {
    fs.mkdirSync(testPlansDir, { recursive: true });
  }

  const filename = path.join(testPlansDir, `${testType}-test.jmx`);
  fs.writeFileSync(filename, xml, 'utf8');

  return filename;
}

/**
 * Main execution
 */
function main() {
  console.log('\n📋 Generating JMeter Test Plans...\n');

  let count = 0;
  Object.entries(testConfigs).forEach(([testType, config]) => {
    try {
      const xml = generateTestPlan(testType, config);
      const filename = saveTestPlan(testType, xml);
      console.log(`✅ Created: ${path.basename(filename)}`);
      console.log(`   Config: ${config.threads} users, ${config.rampUp}s ramp-up, ${config.duration}s duration`);
      count++;
    } catch (error) {
      console.error(`❌ Error creating ${testType}: ${error.message}`);
    }
  });

  console.log(`\n✅ Generated ${count} test plans in jmeter/test-plans/\n`);
  console.log('📝 Next steps:');
  console.log('   npm run test:load:smoke    - Run 5-min smoke test');
  console.log('   npm run test:load          - Run 15-min ramp-up test\n');
}

main();
