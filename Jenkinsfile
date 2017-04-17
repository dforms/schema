pipeline {
    agent any
    stages {
        stage('test') {
            steps {
                withEnv(["PATH+NODE=${tool name: 'node', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'}/bin"]) {
                    sh 'npm test'
                }
            }
        }
    }
}
