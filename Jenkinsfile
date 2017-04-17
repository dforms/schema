pipeline {
    agent any
    stages {
        stage('test') {
            steps {
                withEnv(["PATH+NODE=${tool name: 'node', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'}/bin"]) {
                    sh 'npm install-test'
                }
                junit testDataPublishers: [[$class: 'StabilityTestDataPublisher']], testResults: 'junit.xml'
                step([$class: 'CloverPublisher', cloverReportFileName: 'clover.xml', failingTarget: [], healthyTarget: [conditionalCoverage: 80, methodCoverage: 70, statementCoverage: 80], unhealthyTarget: []])
            }
        }
    }
}
