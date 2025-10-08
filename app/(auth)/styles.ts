import { StyleSheet } from 'react-native';
import { colors } from '../styles/colors';

export const authStyles = StyleSheet.create({
  brand: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  smallText: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
});