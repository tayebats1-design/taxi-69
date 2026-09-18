import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';
import 'firestore_service.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirestoreService _firestoreService = FirestoreService();

  User? get currentUser => _auth.currentUser;

  Stream<User?> get authStateChanges => _auth.authStateChanges();

  /// تسجيل الدخول بالهاتف أو مجهول للاختبار
  Future<UserModel?> signInWithPhone(String phoneNumber) async {
    // محاكاة أو تسجيل حقيقي برقم الهاتف
    return UserModel(
      id: _auth.currentUser?.uid ?? 'user-demo',
      name: 'زبون تجريبي',
      phone: phoneNumber,
      createdAt: DateTime.now(),
    );
  }

  /// تسجيل الخروج
  Future<void> signOut() async {
    await _auth.signOut();
  }
}
