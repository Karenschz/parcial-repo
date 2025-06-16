import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function CustomToast({ text1, text2 }: any) {
    return (
        <View style={styles.toastContainer}>
            <Text style={styles.text1}>{text1}</Text>
            {text2 ? <Text style={styles.text2}>{text2}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    toastContainer: {
        width: '80%',
        backgroundColor: '#007bff',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center', // centrado horizontal
        marginTop: 300, // empujarlo al centro verticalmente
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    text1: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    text2: {
        color: 'white',
        fontSize: 16,
        marginTop: 5,
    },
});