pipeline {
    agent any
    stages {
        stage('test') {
            steps {
                withEnv(["PATH+NODE=${tool name: 'node', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'}/bin"]) {
                    sh 'npm install-test'
                }
                junit testDataPublishers: [[$class: 'StabilityTestDataPublisher']], testResults: 'junit.xml'
                publishHTML([allowMissing: false, alwaysLinkToLastBuild: false, keepAll: false, reportDir: 'coverage/remapped/html', reportFiles: 'index.html', reportName: 'Coverage'])
                step([$class: 'WsCleanup'])
            }
        }
    }
}
