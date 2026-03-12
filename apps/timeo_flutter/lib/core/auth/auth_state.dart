enum AuthStatus { initial, authenticated, unauthenticated, loading }

class AuthState {
  final AuthStatus status;
  final String? token;
  final String? memberId;
  final String? memberName;
  final String? role; // 'customer', 'staff', 'admin'
  final String? error;

  const AuthState({
    this.status = AuthStatus.initial,
    this.token,
    this.memberId,
    this.memberName,
    this.role,
    this.error,
  });

  AuthState copyWith({
    AuthStatus? status,
    String? token,
    String? memberId,
    String? memberName,
    String? role,
    String? error,
  }) {
    return AuthState(
      status: status ?? this.status,
      token: token ?? this.token,
      memberId: memberId ?? this.memberId,
      memberName: memberName ?? this.memberName,
      role: role ?? this.role,
      error: error ?? this.error,
    );
  }
}
