<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 50), 1), 200);
        $admin = $request->user();

        // Batasi query user berdasarkan admin yang sedang login (scope hirarkis wilayah & level instansi)
        $query = User::query()
            ->forAdminUser($admin)
            ->with(['instansi', 'instansiLevel']);

        if ($request->filled('search')) {
            $term = '%' . trim($request->input('search')) . '%';
            $query->where(function ($sub) use ($term) {
                $sub->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhereHas('instansi', function ($q) use ($term) {
                        $q->where('name', 'like', $term);
                    });
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        $users = $query
            ->orderBy('name')
            ->paginate($perPage);

        $allUsers = clone $query;
        $all = $allUsers->get();

        $total = $all->count();
        $active = $all->whereNotNull('last_login_at')->count();
        $inactive = $total - $active;

        $rolesCount = $all->groupBy('role')->map->count();

        $verified = $all->whereNotNull('email_verified_at')->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'items' => UserResource::collection($users->items()),
                'stats' => [
                    'total' => $total,
                    'active' => $active,
                    'inactive' => $inactive,
                    'roles' => $rolesCount,
                    'verified' => $verified,
                ],
            ],
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        // Sederhana: untuk saat ini, tidak ada aturan tambahan selain harus terautentikasi.
        // Jika nanti perlu pembatasan role tertentu (mis. hanya super_admin),
        // bisa ditambahkan gate/policy di sini.

        $user->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'User berhasil dihapus.',
        ]);
    }
}
