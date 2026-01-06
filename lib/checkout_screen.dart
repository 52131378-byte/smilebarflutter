import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class CheckoutScreen extends StatefulWidget {
  final List<Map<String, dynamic>> cartItems;

  const CheckoutScreen({super.key, required this.cartItems});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();

  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _notesController = TextEditingController();

  bool isLoading = false;
  bool cashOnDelivery = true;

  // ⚠ Use your actual API endpoint
  final String apiUrl = "http://localhost:5000/api/orders/guest";

  double get totalPrice {
    double total = 0;
    for (var item in widget.cartItems) {
      total += (item['price'] as num) * (item['quantity'] ?? 1);
    }
    return total;
  }

  Future<void> placeOrder() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => isLoading = true);

    try {
      // Build payload exactly matching backend requirements
      final body = {
        "client_id": 1, // Must be a valid client in DB
        "full_name": _fullNameController.text.trim(),
        "phone": _phoneController.text.trim(),
        "address": _addressController.text.trim(),
        "city": _cityController.text.trim(),
        "notes": _notesController.text.trim(),
        "payment_method": cashOnDelivery ? "cash_on_delivery" : "online",
        "items": widget.cartItems.map((item) {
          return {
            "item_id": int.tryParse(item["id"].toString()) ?? 0,
            "quantity": item["quantity"] ?? 1,
          };
        }).toList(),
      };

      final response = await http.post(
        Uri.parse(apiUrl),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode(body),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 201) {
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text("Order Confirmed"),
            content: Text(
              "Order ID: ${data["id"]}\nTotal: \$${data["total"].toStringAsFixed(2)}",
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context); // close dialog
                  Navigator.pop(context); // go back
                },
                child: const Text("OK"),
              )
            ],
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data["message"] ?? "Unknown error")),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text("Error: $e")));
    } finally {
      setState(() => isLoading = false);
    }
  }

  Widget _input(TextEditingController controller, String label, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextFormField(
        controller: controller,
        validator: (v) => v == null || v.isEmpty ? "Required" : null,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon),
          border: const OutlineInputBorder(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Checkout")),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            ...widget.cartItems.map((item) => ListTile(
                  leading: item['image'] != null
                      ? Image.network(
                          "http://localhost:5000/uploads/${item['image']}",
                          width: 50,
                          height: 50,
                          fit: BoxFit.cover,
                        )
                      : const SizedBox(width: 50, height: 50),
                  title: Text(item['name']),
                  subtitle: Text("Qty: ${item['quantity'] ?? 1}"),
                  trailing: Text("\$${item['price']}"),
                )),
            const Divider(height: 30),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  _input(_fullNameController, "Full Name", Icons.person),
                  _input(_phoneController, "Phone", Icons.phone),
                  _input(_addressController, "Address", Icons.location_on),
                  _input(_cityController, "City", Icons.location_city),
                  _input(_notesController, "Notes (optional)", Icons.note),
                ],
              ),
            ),
            CheckboxListTile(
              value: cashOnDelivery,
              onChanged: (v) => setState(() => cashOnDelivery = v!),
              title: const Text("Cash on Delivery"),
            ),
            Text(
              "Total: \$${totalPrice.toStringAsFixed(2)}",
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: isLoading ? null : placeOrder,
                child: isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text("Place Order"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
