[Environment]::SetEnvironmentVariable('EXPO_PACKAGER_HOSTNAME', '192.168.1.10', 'Process')
[Environment]::SetEnvironmentVariable('REACT_NATIVE_PACKAGER_HOSTNAME', '192.168.1.10', 'Process')
npx expo start --lan
