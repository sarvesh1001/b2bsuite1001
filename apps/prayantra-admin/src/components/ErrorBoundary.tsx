// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Text, View, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, componentStack: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary caught:', error);
    console.error('📌 Component stack:', errorInfo.componentStack);
    this.setState({ componentStack: errorInfo.componentStack || null });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, componentStack: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Modal visible={true} transparent={false} animationType="slide">
          <View style={styles.modalContainer}>
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
              <Text style={styles.title}>❌ Rendering Error</Text>
              <Text style={styles.errorLabel}>Error:</Text>
              <Text style={styles.error}>{this.state.error?.message}</Text>
              <Text style={styles.stackTitle}>Component Stack:</Text>
              <Text style={styles.stack}>
                {this.state.componentStack || 'No stack available'}
              </Text>
              <TouchableOpacity style={styles.resetButton} onPress={this.handleReset}>
                <Text style={styles.resetText}>Try Again</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 40 },
  scrollContainer: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#ff0000' },
  errorLabel: { fontWeight: 'bold', marginTop: 12, fontSize: 16 },
  error: { color: '#cc0000', marginBottom: 12, fontSize: 16 },
  stackTitle: { fontWeight: 'bold', marginTop: 12, fontSize: 16 },
  stack: { fontSize: 12, color: '#333', fontFamily: 'monospace' },
  resetButton: { backgroundColor: '#7B2FBE', padding: 12, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  resetText: { color: 'white', fontWeight: 'bold' },
});