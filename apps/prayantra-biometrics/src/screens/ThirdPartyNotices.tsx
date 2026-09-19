import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';

export default function ThirdPartyNotices() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Third‑Party Notices</Text>
      <Text style={styles.subtitle}>
        This application uses the following open source components:
      </Text>

      {/* ---- YUNET (MIT) ---- */}
      <View style={styles.section}>
        <Text style={styles.licenseName}>YuNet (Face Detection)</Text>
        <Text style={styles.licenseLabel}>License: MIT</Text>
        <Text style={styles.licenseText}>
          {`Copyright (c) 2020 Shiqi Yu <shiqi.yu@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
        </Text>
        <Text style={styles.checksum}>
          SHA‑256: 8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4
        </Text>
      </View>

      {/* ---- SFACE (Apache 2.0) ---- */}
      <View style={styles.section}>
        <Text style={styles.licenseName}>SFace (Face Recognition)</Text>
        <Text style={styles.licenseLabel}>License: Apache 2.0</Text>
        <Text style={styles.licenseText}>
          {`Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`}
        </Text>
        <Text style={styles.checksum}>
          SHA‑256: 0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79
        </Text>
        <Text style={styles.licenseText}>
          {`\nFull Apache 2.0 license text is available at:
https://www.apache.org/licenses/LICENSE-2.0`}
        </Text>
      </View>

      {/* ---- ONNX Runtime (MIT) ---- */}
      <View style={styles.section}>
        <Text style={styles.licenseName}>ONNX Runtime</Text>
        <Text style={styles.licenseLabel}>License: MIT</Text>
        <Text style={styles.licenseText}>
          {`Copyright (c) Microsoft Corporation. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
        </Text>
      </View>

      {/* ---- React Native / Expo (MIT) ---- */}
      <View style={styles.section}>
        <Text style={styles.licenseName}>React Native & Expo</Text>
        <Text style={styles.licenseLabel}>License: MIT</Text>
        <Text style={styles.licenseText}>
          {`Copyright (c) Meta Platforms, Inc. and affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

[Full MIT text omitted for brevity – see node_modules/react-native/LICENSE]`}
        </Text>
      </View>

      <Text style={styles.footer}>
        For the complete list of dependencies and their licenses, please refer
        to the source repository or the node_modules folder.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 20,
  },
  licenseName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  licenseLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  licenseText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Menlo, monospace',
    color: '#222',
    marginTop: 4,
  },
  checksum: {
    fontSize: 12,
    fontFamily: 'Menlo, monospace',
    color: '#007AFF',
    marginTop: 8,
  },
  footer: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },
});