<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray($request): array
    {
        $user = $this->resource;
        $photoUrl = $user->photo_url;

        if ($photoUrl && ! str_starts_with($photoUrl, 'http://') && ! str_starts_with($photoUrl, 'https://') && ! str_starts_with($photoUrl, '//')) {
            $photoUrl = Storage::disk('public')->url($photoUrl);
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'phone' => $user->phone,
            'photo_url' => $photoUrl,
            'admin_code' => $user->admin_code,
            'last_login_at' => optional($user->last_login_at)->toIso8601String(),
            'instansi' => $user->instansi ? [
                'id' => $user->instansi->id,
                'name' => $user->instansi->name,
                'slug' => $user->instansi->slug,
                'category' => $user->instansi->category,
                'address' => $user->instansi->address,
                'phone' => $user->instansi->phone,
                'email' => $user->instansi->email,
            ] : null,
            'instansi_level' => $user->instansiLevel ? [
                'id' => $user->instansiLevel->id,
                'code' => $user->instansiLevel->code,
                'name' => $user->instansiLevel->name,
                'description' => $user->instansiLevel->description,
            ] : null,
            'origin_regency' => $user->originRegency ? [
                'id' => $user->originRegency->id,
                'code' => $user->originRegency->code,
                'name' => $user->originRegency->name,
                'type' => $user->originRegency->type,
            ] : null,
            'origin_district' => $user->originDistrict ? [
                'id' => $user->originDistrict->id,
                'code' => $user->originDistrict->code,
                'name' => $user->originDistrict->name,
            ] : null,
            'origin_village' => $user->originVillage ? [
                'id' => $user->originVillage->id,
                'code' => $user->originVillage->code,
                'name' => $user->originVillage->name,
            ] : null,
        ];
    }
}
